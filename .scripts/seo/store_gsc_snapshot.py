#!/usr/bin/env python3
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PROJECT_URL = os.environ.get('SUPABASE_URL', 'https://piujsvgbfflrrvauzsxe.supabase.co')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
OUT_DIR = ROOT / 'output'
SOURCES = [
    ('gsc_trends', OUT_DIR / 'gsc-trends.json'),
    ('gsc_audit', OUT_DIR / 'gsc-audit.json'),
]

if not SERVICE_KEY:
    raise SystemExit('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.')


def post_rows(rows):
    payload = json.dumps(rows)
    proc = subprocess.run(
        [
            'curl',
            '-fsS',
            '-X', 'POST',
            f'{PROJECT_URL}/rest/v1/gsc_snapshots',
            '-H', f'apikey: {SERVICE_KEY}',
            '-H', f'Authorization: Bearer {SERVICE_KEY}',
            '-H', 'Content-Type: application/json',
            '-H', 'Prefer: return=minimal',
            '--data-binary', '@-',
        ],
        input=payload,
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(proc.stderr.strip() or proc.stdout.strip() or f'curl failed with exit code {proc.returncode}')
    return proc.stdout


def main():
    rows = []
    for snapshot_type, file_path in SOURCES:
        if not file_path.exists():
            continue
        payload = json.loads(file_path.read_text(encoding='utf-8'))
        rows.append({
            'snapshot_type': snapshot_type,
            'source': 'local-gsc-audit',
            'payload_json': payload,
        })
    if not rows:
        print('No local GSC output files found. Nothing to store.')
        return
    post_rows(rows)
    print(f'Stored {len(rows)} GSC snapshot rows.')


if __name__ == '__main__':
    main()
