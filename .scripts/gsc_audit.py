#!/usr/bin/env python3
import json, re, subprocess, sys, time
from collections import Counter
from pathlib import Path

ROOT = Path('/Users/basmetten/peuterplannen')
TOKEN_FILE = Path('/Users/basmetten/.config/peuterplannen/gsc_oauth.json')
CLIENT_FILE = Path('/Users/basmetten/Downloads/client_secret_639736156221-u492c5qpui14ofupf1mug6asml1rmkdq.apps.googleusercontent.com.json')
OUT_JSON = ROOT / 'output' / 'gsc-audit.json'
OUT_MD = ROOT / 'output' / 'gsc-audit.md'
SITE = 'sc-domain:peuterplannen.nl'


def sh(cmd):
    return subprocess.check_output(cmd, shell=True, text=True)


def refresh_token():
    if not TOKEN_FILE.exists():
        raise SystemExit('Missing GSC OAuth token file')
    client = json.loads(CLIENT_FILE.read_text())['installed']
    creds = json.loads(TOKEN_FILE.read_text())
    cmd = (
        "curl -sS https://oauth2.googleapis.com/token "
        f"-d client_id='{client['client_id']}' "
        f"-d client_secret='{client['client_secret']}' "
        f"-d refresh_token='{creds['refresh_token']}' "
        "-d grant_type=refresh_token"
    )
    data = json.loads(sh(cmd))
    if 'access_token' not in data:
        raise SystemExit(f"Token refresh failed: {data}")
    return data['access_token']


def gget(url, token):
    return json.loads(sh(f"curl -sS -H \"Authorization: Bearer {token}\" '{url}'"))


def gpost(url, payload, token):
    body = json.dumps(payload)
    return json.loads(sh(f"curl -sS -X POST -H \"Authorization: Bearer {token}\" -H 'Content-Type: application/json' -d '{body}' '{url}'"))


def inspect_urls(urls, token):
    out = []
    for u in urls:
        data = gpost('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
            'inspectionUrl': u,
            'siteUrl': SITE,
            'languageCode': 'nl-NL'
        }, token)
        iri = data.get('inspectionResult', {}).get('indexStatusResult', {})
        out.append({
            'url': u,
            'verdict': iri.get('verdict'),
            'coverageState': iri.get('coverageState'),
            'pageFetchState': iri.get('pageFetchState'),
            'googleCanonical': iri.get('googleCanonical'),
            'userCanonical': iri.get('userCanonical'),
            'lastCrawlTime': iri.get('lastCrawlTime')
        })
        time.sleep(0.15)
    return out


def sitemap_urls():
    text = (ROOT / 'sitemap.xml').read_text()
    return re.findall(r'<loc>([^<]+)</loc>', text)


def build_sample(urls):
    sample = []
    for u in urls:
        path = u.replace('https://peuterplannen.nl', '')
        if path.count('/') <= 2 and u not in sample:
            sample.append(u)
    rest = [u for u in urls if u not in sample]
    sample.extend(rest[::12])
    return sample[:120]


def main():
    token = refresh_token()
    sites = gget('https://searchconsole.googleapis.com/webmasters/v3/sites', token)
    sitemaps = gget(f'https://searchconsole.googleapis.com/webmasters/v3/sites/{SITE}/sitemaps', token)
    pages = gpost(f'https://searchconsole.googleapis.com/webmasters/v3/sites/{SITE}/searchAnalytics/query', {
        'startDate': '2025-12-06',
        'endDate': '2026-03-05',
        'dimensions': ['page'],
        'rowLimit': 250,
        'dataState': 'final'
    }, token)
    queries = gpost(f'https://searchconsole.googleapis.com/webmasters/v3/sites/{SITE}/searchAnalytics/query', {
        'startDate': '2025-12-06',
        'endDate': '2026-03-05',
        'dimensions': ['query'],
        'rowLimit': 100,
        'dataState': 'final'
    }, token)
    urls = sitemap_urls()
    sample = build_sample(urls)
    inspected = inspect_urls(sample, token)
    coverage = Counter((r.get('coverageState') or 'UNKNOWN') for r in inspected)
    verdict = Counter((r.get('verdict') or 'UNKNOWN') for r in inspected)
    report = {
        'site': SITE,
        'sites': sites,
        'sitemaps': sitemaps,
        'page_rows': pages.get('rows', []),
        'query_rows': queries.get('rows', []),
        'inspection_sample_size': len(inspected),
        'inspection_coverage_counts': dict(coverage),
        'inspection_verdict_counts': dict(verdict),
        'inspection_rows': inspected,
    }
    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    lines = []
    lines.append('# GSC Audit')
    lines.append(f"- Property: `{SITE}`")
    lines.append(f"- Sitemap submitted: {sitemaps.get('sitemap', [{}])[0].get('contents', [{}])[0].get('submitted', 'n/a')}")
    lines.append(f"- Sitemap indexed: {sitemaps.get('sitemap', [{}])[0].get('contents', [{}])[0].get('indexed', 'n/a')}")
    lines.append(f"- Search Analytics page rows: {len(pages.get('rows', []))}")
    lines.append(f"- Search Analytics query rows: {len(queries.get('rows', []))}")
    lines.append(f"- URL Inspection sample: {len(inspected)}")
    lines.append('## Coverage sample')
    for k, v in coverage.items():
        lines.append(f"- {k}: {v}")
    lines.append('## Non-pass examples')
    for row in inspected:
        if row.get('verdict') != 'PASS':
            lines.append(f"- {row.get('coverageState')}: {row.get('url')}")
    OUT_MD.write_text('\n'.join(lines) + '\n')
    print(str(OUT_JSON))
    print(str(OUT_MD))

if __name__ == '__main__':
    main()
