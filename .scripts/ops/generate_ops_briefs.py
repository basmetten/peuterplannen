#!/usr/bin/env python3
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'output'
OUT_DIR.mkdir(parents=True, exist_ok=True)
OPS_JSON = OUT_DIR / 'ops-briefs.json'
SEO_MD = OUT_DIR / 'seo-report.md'
NEWS_MD = OUT_DIR / 'newsletter-brief.md'
DIST_MD = OUT_DIR / 'distribution-brief.md'
PROJECT_URL = os.environ.get('SUPABASE_URL', 'https://piujsvgbfflrrvauzsxe.supabase.co')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')


def read_json(path):
    if path.exists():
      return json.loads(path.read_text(encoding='utf-8'))
    return None


def rest_get(pathname):
    if not SERVICE_KEY:
        return None
    url = f"{PROJECT_URL}/rest/v1/{pathname}"
    proc = subprocess.run([
        'curl', '-fsS', '-H', f'apikey: {SERVICE_KEY}', '-H', f'Authorization: Bearer {SERVICE_KEY}', url
    ], text=True, capture_output=True)
    if proc.returncode != 0:
        return None
    raw = proc.stdout.strip()
    return json.loads(raw) if raw else None


def rest_upsert_rows(rows):
    if not SERVICE_KEY or not rows:
        return False
    payload = json.dumps(rows)
    proc = subprocess.run([
        'curl', '-fsS', '-X', 'POST',
        f'{PROJECT_URL}/rest/v1/ops_briefs?on_conflict=brief_type,source',
        '-H', f'apikey: {SERVICE_KEY}',
        '-H', f'Authorization: Bearer {SERVICE_KEY}',
        '-H', 'Content-Type: application/json',
        '-H', 'Prefer: resolution=merge-duplicates,return=minimal',
        '--data-binary', '@-'
    ], input=payload, text=True, capture_output=True)
    return proc.returncode == 0


def load_gsc_trends():
    local = read_json(OUT_DIR / 'gsc-trends.json')
    if local:
        return local
    rows = rest_get('gsc_snapshots?select=snapshot_type,payload_json,created_at&snapshot_type=eq.gsc_trends&order=created_at.desc&limit=1')
    if isinstance(rows, list) and rows:
        return rows[0].get('payload_json')
    return None


def load_trust_gaps():
    return read_json(OUT_DIR / 'trust-context-gaps.json') or {'top_priority': [], 'summary': {}}


def load_registry():
    return read_json(OUT_DIR / 'seo-registry.json') or {'entries': [], 'counts': {}}


def to_pct(value):
    try:
        return f"{float(value) * 100:.1f}%"
    except Exception:
        return '-'


def page_label(row):
    return row.get('path') or row.get('page') or '-'


def build_seo_brief(gsc, trust, registry):
    summary = (gsc or {}).get('summary', {}).get('current', {})
    top_pages = (gsc or {}).get('top_pages', [])[:8]
    top_queries = (gsc or {}).get('top_queries', [])[:8]
    top_gaps = trust.get('top_priority', [])[:12]
    counts = registry.get('counts', {})
    entries = registry.get('entries', [])
    support_with_signal = [e for e in entries if e.get('tier') == 'support' and e.get('has_gsc_signal')][:12]
    lines = [
        '# SEO ops brief',
        '',
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        '',
        '## Snapshot',
        f"- Klikken (7d): {summary.get('clicks', 0)}",
        f"- Vertoningen (7d): {summary.get('impressions', 0)}",
        f"- CTR (7d): {to_pct(summary.get('ctr', 0))}",
        f"- Gemiddelde positie: {summary.get('position', '-')}",
        f"- SEO registry totaal: {counts.get('total', 0)} urls",
        f"- Indexeerbare details: {counts.get('by_tier', {}).get('index', 0)}",
        f"- Support details: {counts.get('by_tier', {}).get('support', 0)}",
        '',
        '## Prioriteiten komende 2 weken',
        '1. Vul trust-context op high-signal detailpagina’s met clicks/impressions eerst.',
        '2. Promoveer alleen detailpagina’s met duidelijke locality en praktische differentiatie.',
        '3. Gebruik cluster- en regiohubs als hoofdlaag voor interne linking.',
        '',
        '## Top trust gaps',
    ]
    lines += [f"- {row['name']} ({row['region']}) · {row.get('clicks',0)} kliks · {row.get('impressions',0)} vertoningen · ontbreekt: {', '.join(row.get('missing_fields', [])[:4])}" for row in top_gaps] or ['- Geen data']
    lines += ['', '## Top pages']
    lines += [f"- {page_label(row)} · {row.get('clicks',0)} kliks · {row.get('impressions',0)} vertoningen · positie {row.get('position','-')}" for row in top_pages] or ['- Geen data']
    lines += ['', '## Top queries']
    lines += [f"- {row.get('query','-')} · {row.get('clicks',0)} kliks · {row.get('impressions',0)} vertoningen · positie {row.get('position','-')}" for row in top_queries] or ['- Geen data']
    lines += ['', '## Supportpagina\'s met signaal']
    lines += [f"- {row.get('path')} · quality_score {row.get('quality_score')} · GSC signaal aanwezig" for row in support_with_signal] or ['- Geen supportpagina\'s met GSC-signaal in registry']
    body = '\n'.join(lines)
    payload = {
        'summary': summary,
        'top_context_gaps': top_gaps,
        'top_pages': top_pages,
        'top_queries': top_queries,
        'support_with_signal': support_with_signal,
    }
    return {'brief_type': 'seo_ops', 'source': 'ops-generator', 'status': 'active', 'title': 'SEO ops brief', 'body_md': body, 'payload_json': payload}


def build_newsletter_brief(gsc, trust):
    top_pages = (gsc or {}).get('top_pages', [])[:10]
    top_queries = (gsc or {}).get('top_queries', [])[:10]
    top_gaps = trust.get('top_priority', [])[:8]
    region_counts = {}
    for row in top_gaps:
        region_counts[row['region']] = region_counts.get(row['region'], 0) + 1
    leading_regions = [r for r,_ in sorted(region_counts.items(), key=lambda item: item[1], reverse=True)[:4]]
    lines = [
        '# Nieuwsbrief-brief',
        '',
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        '',
        '## Doel',
        'Maak een compacte editie die ouders direct helpt kiezen voor de komende 7-14 dagen.',
        '',
        '## Aanbevolen invalshoeken',
        '- 1 seizoens-/weersituatie (regen of koud weekend)',
        '- 1 regiogids met duidelijke use cases',
        '- 1 praktische shortlist voor 0-2 of 2-5 jaar',
        '- 1 subtiele CTA naar de shortlist of app',
        '',
        '## Kansrijke regio\'s uit trust/backlog',
    ]
    lines += [f"- {region}" for region in leading_regions] or ['- Gebruik deze week de regio met de meeste nieuwe GSC-indrukken.']
    lines += ['', '## Pagina\'s die tractie tonen']
    lines += [f"- {page_label(row)} · {row.get('impressions',0)} vertoningen" for row in top_pages[:6]] or ['- Geen data']
    lines += ['', '## Zoektermen die redactionele invalshoek geven']
    lines += [f"- {row.get('query')}" for row in top_queries[:8]] or ['- Geen data']
    body = '\n'.join(lines)
    payload = {'top_pages': top_pages, 'top_queries': top_queries, 'priority_regions': leading_regions, 'top_context_gaps': top_gaps}
    return {'brief_type': 'newsletter', 'source': 'ops-generator', 'status': 'active', 'title': 'Nieuwsbrief brief', 'body_md': body, 'payload_json': payload}


def build_distribution_brief(gsc, trust):
    top_pages = (gsc or {}).get('top_pages', [])[:8]
    top_queries = (gsc or {}).get('top_queries', [])[:8]
    top_gaps = trust.get('top_priority', [])[:8]
    lines = [
        '# Distribution brief',
        '',
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        '',
        '## Founder-led distributie deze maand',
        '- Deel geen algemene platformpitch; deel steeds één concreet probleem + één routepagina.',
        '- Gebruik regiohubs en clusterpagina\'s als primaire landingslaag.',
        '- Gebruik detailpagina\'s alleen als er al duidelijke zoek- of merktractie is.',
        '',
        '## Kansrijke distributiehoeken',
        '- Regen / slechtweer-opties',
        '- Koffie + spelen',
        '- 0-2 jaar / dreumesproof',
        '- Lokale stadsgids per regio',
        '',
        '## Huidige tractiesignalen',
    ]
    lines += [f"- {page_label(row)} · {row.get('clicks',0)} kliks · {row.get('impressions',0)} vertoningen" for row in top_pages] or ['- Geen data']
    lines += ['', '## Query-hoeken om in copy/social te gebruiken']
    lines += [f"- {row.get('query')}" for row in top_queries] or ['- Geen data']
    lines += ['', '## Locaties waar trust-context eerst moet worden gevuld voor distributie']
    lines += [f"- {row['name']} ({row['region']})" for row in top_gaps[:6]] or ['- Geen data']
    body = '\n'.join(lines)
    payload = {'top_pages': top_pages, 'top_queries': top_queries, 'top_context_gaps': top_gaps}
    return {'brief_type': 'distribution', 'source': 'ops-generator', 'status': 'active', 'title': 'Distribution brief', 'body_md': body, 'payload_json': payload}


def main():
    gsc = load_gsc_trends() or {}
    trust = load_trust_gaps()
    registry = load_registry()
    briefs = [
        build_seo_brief(gsc, trust, registry),
        build_newsletter_brief(gsc, trust),
        build_distribution_brief(gsc, trust),
    ]
    OPS_JSON.write_text(json.dumps({'generated_at': datetime.now(timezone.utc).isoformat(), 'briefs': briefs}, indent=2, ensure_ascii=False), encoding='utf-8')
    SEO_MD.write_text(briefs[0]['body_md'], encoding='utf-8')
    NEWS_MD.write_text(briefs[1]['body_md'], encoding='utf-8')
    DIST_MD.write_text(briefs[2]['body_md'], encoding='utf-8')
    stored = rest_upsert_rows(briefs)
    print(f'Wrote {OPS_JSON}')
    print(f'Wrote {SEO_MD}')
    print(f'Wrote {NEWS_MD}')
    print(f'Wrote {DIST_MD}')
    print(f'Upserted ops briefs: {stored}')


if __name__ == '__main__':
    main()
