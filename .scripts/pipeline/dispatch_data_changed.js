const DEFAULT_EVENT_TYPE = 'data-changed';

async function dispatchDataChanged({ source = 'unknown', summary = null } = {}) {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || 'basmetten/peuterplannen';
  const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';

  if (!token) {
    return { ok: false, skipped: true, reason: 'missing_github_token' };
  }

  const payload = {
    event_type: DEFAULT_EVENT_TYPE,
    client_payload: {
      source,
      timestamp: new Date().toISOString(),
      summary,
    },
  };

  const response = await fetch(`${apiBase}/repos/${repository}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PeuterPlannenPipeline/1.0',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`repository_dispatch failed: ${response.status} ${body.slice(0, 300)}`);
  }

  return { ok: true, skipped: false };
}

if (require.main === module) {
  const source = process.argv[2] || 'manual';
  dispatchDataChanged({ source })
    .then((result) => {
      if (result.skipped) {
        console.log(`dispatch skipped: ${result.reason}`);
      } else {
        console.log('dispatch sent');
      }
    })
    .catch((err) => {
      console.error(err.message || String(err));
      process.exit(1);
    });
}

module.exports = {
  dispatchDataChanged,
};
