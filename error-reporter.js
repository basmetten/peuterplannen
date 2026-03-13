/**
 * Lightweight client-side error reporter.
 * Sends errors to Supabase via sendBeacon (anon key, insert-only).
 * Zero PII. No consent required.
 */
(function() {
  var SB = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/client_errors';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdWpzdmdiZmZscnJ2YXV6c3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDMxNzAsImV4cCI6MjA4NzYxOTE3MH0.5y3gqiPfVvpvfaDYA_PgqE-KTvuf6zgN6vGzqfUpeSo';

  function send(payload) {
    try {
      fetch(SB, {
        method: 'POST',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch(e) {}
  }

  window.onerror = function(msg, src, line, col, err) {
    send({
      message: String(msg).slice(0, 500),
      source: String(src || '').slice(0, 200),
      line: line,
      col: col,
      stack: err && err.stack ? String(err.stack).slice(0, 1000) : null,
      url: location.href.slice(0, 200),
      ua: navigator.userAgent.slice(0, 200),
      ts: new Date().toISOString()
    });
  };

  window.addEventListener('unhandledrejection', function(e) {
    send({
      message: 'Unhandled rejection: ' + String(e.reason).slice(0, 500),
      url: location.href.slice(0, 200),
      ua: navigator.userAgent.slice(0, 200),
      ts: new Date().toISOString()
    });
  });
})();
