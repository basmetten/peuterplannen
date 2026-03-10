#!/usr/bin/env python3
import json
import re
import subprocess
import time
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path('/Users/basmetten/peuterplannen')
TOKEN_FILE = Path('/Users/basmetten/.config/peuterplannen/gsc_oauth.json')
CLIENT_FILE = Path('/Users/basmetten/Downloads/client_secret_639736156221-u492c5qpui14ofupf1mug6asml1rmkdq.apps.googleusercontent.com.json')
OUT_DIR = ROOT / 'output'
OUT_JSON = OUT_DIR / 'gsc-audit.json'
OUT_MD = OUT_DIR / 'gsc-audit.md'
HISTORY_DIR = OUT_DIR / 'gsc-history'
SITE = 'sc-domain:peuterplannen.nl'
ENCODED_SITE = quote(SITE, safe='')
WEBMASTERS_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'
SEARCH_ANALYTICS_URL = f'{WEBMASTERS_BASE}/sites/{ENCODED_SITE}/searchAnalytics/query'
SITEMAPS_URL = f'{WEBMASTERS_BASE}/sites/{ENCODED_SITE}/sitemaps'
SITES_URL = f'{WEBMASTERS_BASE}/sites'
INSPECTION_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

WINDOW_DAYS = 7
FINAL_DATA_LAG_DAYS = 3
PAGE_ROW_LIMIT = 5000
QUERY_ROW_LIMIT = 1000
TOP_LIMIT = 12
OPPORTUNITY_LIMIT = 12
NEAR_WIN_MIN_POSITION = 8.0
NEAR_WIN_MAX_POSITION = 20.0
LOW_CTR_THRESHOLD = 0.02
LOW_CTR_MAX_POSITION = 12.0
MIN_OPPORTUNITY_IMPRESSIONS = 80.0

STATIC_SLUGS = {'app', 'about', 'contact'}
CATEGORY_SLUGS = {'speeltuinen', 'kinderboerderijen', 'musea', 'pannenkoeken', 'natuur', 'zwemmen', 'horeca'}


def sh(cmd):
    return subprocess.check_output(cmd, text=True)


def parse_json(raw):
    raw = (raw or '').strip()
    return json.loads(raw) if raw else {}


def refresh_token():
    if not TOKEN_FILE.exists():
        raise SystemExit('Missing GSC OAuth token file')
    client = json.loads(CLIENT_FILE.read_text(encoding='utf-8'))['installed']
    creds = json.loads(TOKEN_FILE.read_text(encoding='utf-8'))
    data = parse_json(sh([
        'curl',
        '-sS',
        'https://oauth2.googleapis.com/token',
        '-d',
        f"client_id={client['client_id']}",
        '-d',
        f"client_secret={client['client_secret']}",
        '-d',
        f"refresh_token={creds['refresh_token']}",
        '-d',
        'grant_type=refresh_token',
    ]))
    if 'access_token' not in data:
        raise SystemExit(f'Token refresh failed: {data}')
    return data['access_token']


def api_error_message(error):
    if not error:
        return None
    if isinstance(error, dict):
        if isinstance(error.get('errors'), list) and error['errors']:
            first = error['errors'][0]
            if isinstance(first, dict) and first.get('message'):
                return first['message']
        return error.get('message') or error.get('status') or json.dumps(error, ensure_ascii=False)
    return str(error)


def gget(url, token):
    try:
        return parse_json(sh([
            'curl',
            '-sS',
            '-H',
            f'Authorization: Bearer {token}',
            url,
        ]))
    except (subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        return {'error': str(exc)}


def gpost(url, payload, token):
    try:
        return parse_json(sh([
            'curl',
            '-sS',
            '-X',
            'POST',
            '-H',
            f'Authorization: Bearer {token}',
            '-H',
            'Content-Type: application/json',
            '-d',
            json.dumps(payload),
            url,
        ]))
    except (subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        return {'error': str(exc)}


def extract_rows(response):
    rows = response.get('rows') if isinstance(response, dict) else None
    return rows if isinstance(rows, list) else []


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def round_metric(value, digits=2):
    return round(float(value), digits)


def clean_path(url):
    if not url:
        return '/'
    path = urlparse(url).path or '/'
    return path


def infer_page_type(url):
    path = clean_path(url).strip('/')
    if not path:
        return 'homepage'
    parts = [part for part in path.split('/') if part]
    head = parts[0]
    slug = head[:-5] if head.endswith('.html') else head
    if head == 'blog':
        return 'blog_index' if len(parts) == 1 else 'blog_article'
    if len(parts) == 1 and head.endswith('.html'):
        if slug in STATIC_SLUGS:
            return 'static_page'
        if slug in CATEGORY_SLUGS:
            return 'category_hub'
        return 'location_hub'
    if len(parts) >= 2:
        return 'detail_page'
    return 'landing_page'


def normalize_rows(rows, key_name):
    normalized = []
    for row in rows:
        keys = row.get('keys') or []
        key = keys[0] if keys else ''
        item = {
            key_name: key,
            'clicks': to_float(row.get('clicks')),
            'impressions': to_float(row.get('impressions')),
            'ctr': to_float(row.get('ctr')),
            'position': to_float(row.get('position')),
        }
        if key_name == 'page':
            item['path'] = clean_path(key)
            item['page_type'] = infer_page_type(key)
        normalized.append(item)
    return normalized


def summarize_rows(rows):
    clicks = sum(row.get('clicks', 0.0) for row in rows)
    impressions = sum(row.get('impressions', 0.0) for row in rows)
    weighted_position = sum(row.get('position', 0.0) * row.get('impressions', 0.0) for row in rows)
    return {
        'rows': len(rows),
        'clicks': round_metric(clicks),
        'impressions': round_metric(impressions),
        'ctr': round_metric((clicks / impressions) if impressions else 0.0, 4),
        'position': round_metric((weighted_position / impressions) if impressions else 0.0),
    }


def compare_summaries(current, previous):
    position_change = None
    if current.get('impressions') and previous.get('impressions'):
        position_change = round_metric(previous['position'] - current['position'])
    return {
        'click_delta': round_metric(current.get('clicks', 0.0) - previous.get('clicks', 0.0)),
        'impression_delta': round_metric(current.get('impressions', 0.0) - previous.get('impressions', 0.0)),
        'ctr_delta': round_metric(current.get('ctr', 0.0) - previous.get('ctr', 0.0), 4),
        'position_change': position_change,
        'row_delta': current.get('rows', 0) - previous.get('rows', 0),
    }


def merge_rows(current_rows, previous_rows, key_name):
    current_map = {row.get(key_name): row for row in current_rows if row.get(key_name)}
    previous_map = {row.get(key_name): row for row in previous_rows if row.get(key_name)}
    merged = []
    for key in sorted(set(current_map) | set(previous_map)):
        current = current_map.get(key, {})
        previous = previous_map.get(key, {})
        item = {key_name: key}
        if key_name == 'page':
            item['path'] = current.get('path') or previous.get('path') or clean_path(key)
            item['page_type'] = current.get('page_type') or previous.get('page_type') or infer_page_type(key)
        item['clicks'] = round_metric(current.get('clicks', 0.0))
        item['impressions'] = round_metric(current.get('impressions', 0.0))
        item['ctr'] = round_metric(current.get('ctr', 0.0), 4)
        item['position'] = round_metric(current.get('position', 0.0))
        item['previous_clicks'] = round_metric(previous.get('clicks', 0.0))
        item['previous_impressions'] = round_metric(previous.get('impressions', 0.0))
        item['previous_ctr'] = round_metric(previous.get('ctr', 0.0), 4)
        item['previous_position'] = round_metric(previous.get('position', 0.0))
        item['click_delta'] = round_metric(item['clicks'] - item['previous_clicks'])
        item['impression_delta'] = round_metric(item['impressions'] - item['previous_impressions'])
        item['ctr_delta'] = round_metric(item['ctr'] - item['previous_ctr'], 4)
        item['position_change'] = None
        if current.get('impressions') and previous.get('impressions'):
            item['position_change'] = round_metric(previous.get('position', 0.0) - current.get('position', 0.0))
        item['is_new'] = bool(current.get('impressions') and not previous.get('impressions'))
        item['is_lost'] = bool(previous.get('impressions') and not current.get('impressions'))
        merged.append(item)
    return merged


def sort_rows(rows, primary='clicks'):
    return sorted(
        rows,
        key=lambda row: (
            row.get(primary, 0.0),
            row.get('impressions', 0.0),
            row.get('clicks', 0.0),
        ),
        reverse=True,
    )


def aggregate_page_types(page_rows):
    buckets = defaultdict(lambda: {
        'page_type': '',
        'pages': 0,
        'clicks': 0.0,
        'impressions': 0.0,
        'weighted_position': 0.0,
    })
    for row in page_rows:
        bucket = buckets[row.get('page_type') or 'unknown']
        bucket['page_type'] = row.get('page_type') or 'unknown'
        bucket['pages'] += 1
        bucket['clicks'] += row.get('clicks', 0.0)
        bucket['impressions'] += row.get('impressions', 0.0)
        bucket['weighted_position'] += row.get('position', 0.0) * row.get('impressions', 0.0)
    results = []
    for bucket in buckets.values():
        impressions = bucket['impressions']
        clicks = bucket['clicks']
        results.append({
            'page_type': bucket['page_type'],
            'pages': bucket['pages'],
            'clicks': round_metric(clicks),
            'impressions': round_metric(impressions),
            'ctr': round_metric((clicks / impressions) if impressions else 0.0, 4),
            'position': round_metric((bucket['weighted_position'] / impressions) if impressions else 0.0),
        })
    return sorted(results, key=lambda row: (row['clicks'], row['impressions']), reverse=True)


def pick(rows, limit):
    return rows[:limit]


def select_near_win_pages(page_rows):
    rows = [
        row for row in page_rows
        if row.get('impressions', 0.0) >= MIN_OPPORTUNITY_IMPRESSIONS
        and NEAR_WIN_MIN_POSITION <= row.get('position', 0.0) <= NEAR_WIN_MAX_POSITION
        and not row.get('is_lost')
    ]
    return sorted(rows, key=lambda row: (row.get('impressions', 0.0), -row.get('position', 0.0)), reverse=True)


def select_low_ctr_pages(page_rows):
    rows = [
        row for row in page_rows
        if row.get('impressions', 0.0) >= MIN_OPPORTUNITY_IMPRESSIONS
        and row.get('ctr', 0.0) <= LOW_CTR_THRESHOLD
        and row.get('position', 0.0) <= LOW_CTR_MAX_POSITION
        and not row.get('is_lost')
    ]
    return sorted(rows, key=lambda row: (row.get('impressions', 0.0), -row.get('ctr', 0.0)), reverse=True)


def select_gainers(rows):
    gainers = [row for row in rows if row.get('click_delta', 0.0) > 0]
    return sorted(gainers, key=lambda row: (row.get('click_delta', 0.0), row.get('impression_delta', 0.0)), reverse=True)


def select_decliners(rows):
    decliners = [row for row in rows if row.get('click_delta', 0.0) < 0]
    return sorted(decliners, key=lambda row: (row.get('click_delta', 0.0), row.get('impression_delta', 0.0)))


def compact_rows(rows, limit, key_name):
    selected = []
    for row in pick(rows, limit):
        item = {
            key_name: row.get(key_name),
            'clicks': row.get('clicks'),
            'impressions': row.get('impressions'),
            'ctr': row.get('ctr'),
            'position': row.get('position'),
            'click_delta': row.get('click_delta'),
            'impression_delta': row.get('impression_delta'),
            'ctr_delta': row.get('ctr_delta'),
            'position_change': row.get('position_change'),
        }
        if key_name == 'page':
            item['path'] = row.get('path')
            item['page_type'] = row.get('page_type')
            item['is_new'] = row.get('is_new')
            item['is_lost'] = row.get('is_lost')
        selected.append(item)
    return selected


def sitemap_urls_from_file(sitemap_path, visited=None):
    visited = visited or set()
    if sitemap_path in visited or not sitemap_path.exists():
        return []
    visited.add(sitemap_path)
    xml = sitemap_path.read_text(encoding='utf-8')
    if '<sitemapindex' in xml.lower():
        urls = []
        refs = re.findall(r'<loc>https://peuterplannen\.nl/([^<]+\.xml)</loc>', xml)
        for ref in refs:
            urls.extend(sitemap_urls_from_file(ROOT / ref, visited))
        return urls
    return re.findall(r'<loc>(https://peuterplannen\.nl[^<]*)</loc>', xml)


def sitemap_urls():
    return sitemap_urls_from_file(ROOT / 'sitemap.xml')


def build_sample(urls, limit=120):
    sample = []
    seen = set()
    for url in urls:
        path = clean_path(url)
        if path.count('/') <= 2 and url not in seen:
            sample.append(url)
            seen.add(url)
    for url in urls[::12]:
        if url not in seen:
            sample.append(url)
            seen.add(url)
        if len(sample) >= limit:
            break
    return sample[:limit]


def inspect_urls(urls, token):
    out = []
    for url in urls:
        data = gpost(INSPECTION_URL, {
            'inspectionUrl': url,
            'siteUrl': SITE,
            'languageCode': 'nl-NL',
        }, token)
        iri = data.get('inspectionResult', {}).get('indexStatusResult', {})
        out.append({
            'url': url,
            'verdict': iri.get('verdict'),
            'coverageState': iri.get('coverageState'),
            'pageFetchState': iri.get('pageFetchState'),
            'googleCanonical': iri.get('googleCanonical'),
            'userCanonical': iri.get('userCanonical'),
            'lastCrawlTime': iri.get('lastCrawlTime'),
            'api_error': api_error_message(data.get('error')),
        })
        time.sleep(0.15)
    return out


def reporting_windows(today=None):
    today = today or date.today()
    current_end = today - timedelta(days=FINAL_DATA_LAG_DAYS)
    current_start = current_end - timedelta(days=WINDOW_DAYS - 1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=WINDOW_DAYS - 1)
    return {
        'current': {
            'start_date': current_start.isoformat(),
            'end_date': current_end.isoformat(),
            'days': WINDOW_DAYS,
            'data_state': 'final',
        },
        'previous': {
            'start_date': previous_start.isoformat(),
            'end_date': previous_end.isoformat(),
            'days': WINDOW_DAYS,
            'data_state': 'final',
        },
        'data_lag_days': FINAL_DATA_LAG_DAYS,
    }


def search_analytics(token, start_date, end_date, dimensions, row_limit):
    return gpost(SEARCH_ANALYTICS_URL, {
        'startDate': start_date,
        'endDate': end_date,
        'dimensions': dimensions,
        'rowLimit': row_limit,
        'dataState': 'final',
    }, token)


def sitemap_totals(sitemaps):
    submitted = 0.0
    indexed = 0.0
    entries = sitemaps.get('sitemap') if isinstance(sitemaps, dict) else []
    for entry in entries or []:
        for content in entry.get('contents') or []:
            submitted += to_float(content.get('submitted'))
            indexed += to_float(content.get('indexed'))
    return {
        'submitted': round_metric(submitted),
        'indexed': round_metric(indexed),
        'sitemaps': len(entries or []),
    }


def format_number(value, digits=0):
    if value is None:
        return 'n/a'
    if digits == 0:
        return f'{value:,.0f}'
    return f'{value:,.{digits}f}'


def format_pct(value):
    if value is None:
        return 'n/a'
    return f'{value * 100:.1f}%'


def format_signed_number(value, digits=0):
    if value is None:
        return 'n/a'
    if digits == 0:
        return f'{value:+,.0f}'
    return f'{value:+,.{digits}f}'


def format_ctr_delta(value):
    if value is None:
        return 'n/a'
    return f'{value * 100:+.1f} pp'


def md_escape(value):
    text = str(value)
    return text.replace('|', r'\|').replace('\n', ' ').strip()


def add_table(lines, headers, rows, empty_message):
    if not rows:
        lines.append(empty_message)
        return
    lines.append('| ' + ' | '.join(headers) + ' |')
    lines.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')
    for row in rows:
        lines.append('| ' + ' | '.join(md_escape(cell) for cell in row) + ' |')


def page_label(row):
    return row.get('path') or clean_path(row.get('page'))


def query_label(row):
    return row.get('query') or '(empty query)'


def summarize_api_issues(pages_current_resp, pages_previous_resp, queries_current_resp, queries_previous_resp, inspected):
    issues = []
    responses = {
        'current page data': pages_current_resp,
        'previous page data': pages_previous_resp,
        'current query data': queries_current_resp,
        'previous query data': queries_previous_resp,
    }
    for label, response in responses.items():
        message = api_error_message(response.get('error')) if isinstance(response, dict) else None
        if message:
            issues.append(f'{label}: {message}')
    inspection_errors = [row['api_error'] for row in inspected if row.get('api_error')]
    if inspection_errors:
        issues.append(f'URL inspection sample errors: {len(inspection_errors)}')
    return issues


def render_markdown(report):
    current_window = report['report_window']['current']
    previous_window = report['report_window']['previous']
    current_summary = report['summary']['current']
    previous_summary = report['summary']['previous']
    deltas = report['summary']['delta']
    sitemap = report['sitemap_summary']
    top_pages = report['top_pages']
    top_queries = report['top_queries']
    page_types = report['page_type_breakdown']
    comparison = report['comparison']
    inspection = report['inspection']

    lines = []
    lines.append('# Weekly SEO Telemetry')
    lines.append(f"- Generated at: `{report['generated_at']}`")
    lines.append(f"- Property: `{report['site']}`")
    lines.append(f"- Current window: `{current_window['start_date']}` to `{current_window['end_date']}` ({current_window['days']} days, final data)")
    lines.append(f"- Comparison window: `{previous_window['start_date']}` to `{previous_window['end_date']}`")
    lines.append(f"- Search Console lag applied: `{report['report_window']['data_lag_days']}` days")
    lines.append(f"- Latest outputs: `{OUT_JSON.relative_to(ROOT)}`, `{OUT_MD.relative_to(ROOT)}`")
    lines.append(f"- Snapshot outputs: `{report['outputs']['history_json']}`, `{report['outputs']['history_md']}`")
    lines.append('')
    lines.append('## Overview')
    add_table(lines, ['Metric', 'Current', 'Previous', 'Delta'], [
        ['Clicks', format_number(current_summary['clicks']), format_number(previous_summary['clicks']), format_signed_number(deltas['click_delta'])],
        ['Impressions', format_number(current_summary['impressions']), format_number(previous_summary['impressions']), format_signed_number(deltas['impression_delta'])],
        ['CTR', format_pct(current_summary['ctr']), format_pct(previous_summary['ctr']), format_ctr_delta(deltas['ctr_delta'])],
        ['Avg position', format_number(current_summary['position'], 1), format_number(previous_summary['position'], 1), format_signed_number(deltas['position_change'], 1)],
        ['Tracked page rows', format_number(current_summary['rows']), format_number(previous_summary['rows']), format_signed_number(deltas['row_delta'])],
    ], 'No page summary data available.')
    lines.append('')
    lines.append('## Sitemap')
    lines.append(f"- Sitemap files: {format_number(sitemap['sitemaps'])}")
    lines.append(f"- URLs submitted: {format_number(sitemap['submitted'])}")
    lines.append(f"- URLs indexed: {format_number(sitemap['indexed'])}")
    lines.append('')
    lines.append('## Top Pages')
    add_table(lines, ['Page', 'Type', 'Clicks', 'Impr.', 'CTR', 'Pos', 'WoW clicks'], [
        [
            page_label(row),
            row.get('page_type', 'unknown'),
            format_number(row.get('clicks')),
            format_number(row.get('impressions')),
            format_pct(row.get('ctr')),
            format_number(row.get('position'), 1),
            format_signed_number(row.get('click_delta')),
        ]
        for row in top_pages
    ], 'No page rows returned for the current window.')
    lines.append('')
    lines.append('## Top Queries')
    add_table(lines, ['Query', 'Clicks', 'Impr.', 'CTR', 'Pos', 'WoW clicks'], [
        [
            query_label(row),
            format_number(row.get('clicks')),
            format_number(row.get('impressions')),
            format_pct(row.get('ctr')),
            format_number(row.get('position'), 1),
            format_signed_number(row.get('click_delta')),
        ]
        for row in top_queries
    ], 'No query rows returned for the current window.')
    lines.append('')
    lines.append('## Page Types')
    add_table(lines, ['Type', 'Pages', 'Clicks', 'Impr.', 'CTR', 'Pos'], [
        [
            row.get('page_type', 'unknown'),
            format_number(row.get('pages')),
            format_number(row.get('clicks')),
            format_number(row.get('impressions')),
            format_pct(row.get('ctr')),
            format_number(row.get('position'), 1),
        ]
        for row in page_types
    ], 'No page-type breakdown available.')
    lines.append('')
    lines.append('## Winners')
    add_table(lines, ['Page', 'Type', 'Click delta', 'Impr. delta', 'Pos change'], [
        [
            page_label(row),
            row.get('page_type', 'unknown'),
            format_signed_number(row.get('click_delta')),
            format_signed_number(row.get('impression_delta')),
            format_signed_number(row.get('position_change'), 1),
        ]
        for row in comparison['page_gainers']
    ], 'No page gainers in this window.')
    lines.append('')
    add_table(lines, ['Query', 'Click delta', 'Impr. delta', 'Pos change'], [
        [
            query_label(row),
            format_signed_number(row.get('click_delta')),
            format_signed_number(row.get('impression_delta')),
            format_signed_number(row.get('position_change'), 1),
        ]
        for row in comparison['query_gainers']
    ], 'No query gainers in this window.')
    lines.append('')
    lines.append('## Losers')
    add_table(lines, ['Page', 'Type', 'Click delta', 'Impr. delta', 'Pos change'], [
        [
            page_label(row),
            row.get('page_type', 'unknown'),
            format_signed_number(row.get('click_delta')),
            format_signed_number(row.get('impression_delta')),
            format_signed_number(row.get('position_change'), 1),
        ]
        for row in comparison['page_decliners']
    ], 'No page decliners in this window.')
    lines.append('')
    add_table(lines, ['Query', 'Click delta', 'Impr. delta', 'Pos change'], [
        [
            query_label(row),
            format_signed_number(row.get('click_delta')),
            format_signed_number(row.get('impression_delta')),
            format_signed_number(row.get('position_change'), 1),
        ]
        for row in comparison['query_decliners']
    ], 'No query decliners in this window.')
    lines.append('')
    lines.append('## Opportunities')
    lines.append(f"- Near-win filters: position `{NEAR_WIN_MIN_POSITION:.0f}`-`{NEAR_WIN_MAX_POSITION:.0f}`, impressions >= `{format_number(MIN_OPPORTUNITY_IMPRESSIONS)}`")
    lines.append(f"- Low-CTR filters: CTR <= `{format_pct(LOW_CTR_THRESHOLD)}`, position <= `{LOW_CTR_MAX_POSITION:.0f}`, impressions >= `{format_number(MIN_OPPORTUNITY_IMPRESSIONS)}`")
    lines.append('')
    add_table(lines, ['Near-win page', 'Type', 'Clicks', 'Impr.', 'CTR', 'Pos'], [
        [
            page_label(row),
            row.get('page_type', 'unknown'),
            format_number(row.get('clicks')),
            format_number(row.get('impressions')),
            format_pct(row.get('ctr')),
            format_number(row.get('position'), 1),
        ]
        for row in comparison['near_win_pages']
    ], 'No near-win pages matched the current thresholds.')
    lines.append('')
    add_table(lines, ['Low-CTR page', 'Type', 'Clicks', 'Impr.', 'CTR', 'Pos'], [
        [
            page_label(row),
            row.get('page_type', 'unknown'),
            format_number(row.get('clicks')),
            format_number(row.get('impressions')),
            format_pct(row.get('ctr')),
            format_number(row.get('position'), 1),
        ]
        for row in comparison['low_ctr_pages']
    ], 'No low-CTR pages matched the current thresholds.')
    lines.append('')
    lines.append('## Indexing Sample')
    lines.append(f"- Sample size: {format_number(inspection['sample_size'])}")
    lines.append(f"- Coverage states: {', '.join(f'{k}={v}' for k, v in inspection['coverage_counts'].items()) or 'n/a'}")
    lines.append(f"- Verdicts: {', '.join(f'{k}={v}' for k, v in inspection['verdict_counts'].items()) or 'n/a'}")
    if inspection['non_pass_examples']:
        lines.append('- Non-pass examples:')
        for row in inspection['non_pass_examples']:
            suffix = f" ({row['coverageState']})" if row.get('coverageState') else ''
            lines.append(f"  - {row['url']}{suffix}")
    else:
        lines.append('- Non-pass examples: none in sampled URLs.')
    if inspection['errors']:
        lines.append('- Inspection errors:')
        for row in inspection['errors']:
            lines.append(f"  - {row['url']}: {row['api_error']}")
    issues = report['api_issues']
    if issues:
        lines.append('')
        lines.append('## API Notes')
        for issue in issues:
            lines.append(f'- {issue}')
    return '\n'.join(lines) + '\n'


def write_outputs(report):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = report['run_id']
    history_json = HISTORY_DIR / f'gsc-audit-{timestamp}.json'
    history_md = HISTORY_DIR / f'gsc-audit-{timestamp}.md'
    report['outputs'] = {
        'latest_json': str(OUT_JSON.relative_to(ROOT)),
        'latest_md': str(OUT_MD.relative_to(ROOT)),
        'history_json': str(history_json.relative_to(ROOT)),
        'history_md': str(history_md.relative_to(ROOT)),
    }
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    OUT_JSON.write_text(payload, encoding='utf-8')
    history_json.write_text(payload, encoding='utf-8')
    rendered_markdown = render_markdown(report)
    OUT_MD.write_text(rendered_markdown, encoding='utf-8')
    history_md.write_text(rendered_markdown, encoding='utf-8')
    return history_json, history_md


def main():
    now = datetime.now(timezone.utc).replace(microsecond=0)
    run_id = now.strftime('%Y%m%dT%H%M%SZ')
    generated_at = now.isoformat().replace('+00:00', 'Z')
    report_window = reporting_windows()

    token = refresh_token()
    sites = gget(SITES_URL, token)
    sitemaps = gget(SITEMAPS_URL, token)

    current_window = report_window['current']
    previous_window = report_window['previous']

    pages_current_resp = search_analytics(token, current_window['start_date'], current_window['end_date'], ['page'], PAGE_ROW_LIMIT)
    pages_previous_resp = search_analytics(token, previous_window['start_date'], previous_window['end_date'], ['page'], PAGE_ROW_LIMIT)
    queries_current_resp = search_analytics(token, current_window['start_date'], current_window['end_date'], ['query'], QUERY_ROW_LIMIT)
    queries_previous_resp = search_analytics(token, previous_window['start_date'], previous_window['end_date'], ['query'], QUERY_ROW_LIMIT)

    current_pages = normalize_rows(extract_rows(pages_current_resp), 'page')
    previous_pages = normalize_rows(extract_rows(pages_previous_resp), 'page')
    current_queries = normalize_rows(extract_rows(queries_current_resp), 'query')
    previous_queries = normalize_rows(extract_rows(queries_previous_resp), 'query')

    page_summary_current = summarize_rows(current_pages)
    page_summary_previous = summarize_rows(previous_pages)
    page_summary_delta = compare_summaries(page_summary_current, page_summary_previous)

    compared_pages = merge_rows(current_pages, previous_pages, 'page')
    compared_queries = merge_rows(current_queries, previous_queries, 'query')
    page_types = aggregate_page_types(current_pages)

    urls = sitemap_urls()
    sample = build_sample(urls)
    inspected = inspect_urls(sample, token)
    coverage = Counter((row.get('coverageState') or 'UNKNOWN') for row in inspected)
    verdict = Counter((row.get('verdict') or 'UNKNOWN') for row in inspected)
    non_pass = [row for row in inspected if row.get('verdict') != 'PASS']
    inspection_errors = [row for row in inspected if row.get('api_error')]

    report = {
        'run_id': run_id,
        'generated_at': generated_at,
        'site': SITE,
        'report_window': report_window,
        'sites': sites,
        'sitemaps': sitemaps,
        'sitemap_summary': sitemap_totals(sitemaps),
        'summary': {
            'current': page_summary_current,
            'previous': page_summary_previous,
            'delta': page_summary_delta,
        },
        'current': {
            'page_rows': current_pages,
            'query_rows': current_queries,
        },
        'previous': {
            'page_rows': previous_pages,
            'query_rows': previous_queries,
        },
        'top_pages': compact_rows(sort_rows(compared_pages), TOP_LIMIT, 'page'),
        'top_queries': compact_rows(sort_rows(compared_queries), TOP_LIMIT, 'query'),
        'page_type_breakdown': pick(page_types, TOP_LIMIT),
        'comparison': {
            'page_gainers': compact_rows(select_gainers(compared_pages), TOP_LIMIT, 'page'),
            'page_decliners': compact_rows(select_decliners(compared_pages), TOP_LIMIT, 'page'),
            'query_gainers': compact_rows(select_gainers(compared_queries), TOP_LIMIT, 'query'),
            'query_decliners': compact_rows(select_decliners(compared_queries), TOP_LIMIT, 'query'),
            'near_win_pages': compact_rows(select_near_win_pages(compared_pages), OPPORTUNITY_LIMIT, 'page'),
            'low_ctr_pages': compact_rows(select_low_ctr_pages(compared_pages), OPPORTUNITY_LIMIT, 'page'),
        },
        'inspection': {
            'sample_size': len(inspected),
            'coverage_counts': dict(sorted(coverage.items(), key=lambda item: (-item[1], item[0]))),
            'verdict_counts': dict(sorted(verdict.items(), key=lambda item: (-item[1], item[0]))),
            'rows': inspected,
            'non_pass_examples': non_pass[:20],
            'errors': inspection_errors[:20],
        },
        'api_issues': summarize_api_issues(
            pages_current_resp,
            pages_previous_resp,
            queries_current_resp,
            queries_previous_resp,
            inspected,
        ),
    }

    history_json, history_md = write_outputs(report)
    print(str(OUT_JSON))
    print(str(OUT_MD))
    print(str(history_json))
    print(str(history_md))


if __name__ == '__main__':
    main()
