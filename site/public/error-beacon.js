// Forward browser errors, unhandled rejections and CSP violations to the same-origin
// beacon, so a silent UI or policy regression reaches production logs. No SDK and no
// third-party origin: connect-src 'self' holds. Reports carry the path only, because
// query strings and fragments can hold private text.
(() => {
  const seen = new Set();
  const bare = (value) => (typeof value === 'string' ? value.split(/[?#]/, 1)[0].slice(0, 300) : undefined);
  const report = (kind, detail) => {
    const key = [kind, detail.message, detail.source, detail.line, detail.directive, detail.blocked].join('|');
    if (seen.has(key) || seen.size >= 10) return;
    seen.add(key);
    try {
      navigator.sendBeacon('/api/client-error', JSON.stringify({ kind, path: location.pathname, ...detail }));
    } catch { /* Reporting never breaks the page. */ }
  };
  addEventListener('error', (event) => {
    if (!(event instanceof ErrorEvent)) return;
    report('error', { message: String(event.message).slice(0, 300), source: bare(event.filename), line: event.lineno, column: event.colno });
  });
  addEventListener('unhandledrejection', (event) => {
    report('unhandledrejection', { message: String(event.reason?.message ?? event.reason).slice(0, 300) });
  });
  document.addEventListener('securitypolicyviolation', (event) => {
    report('securitypolicyviolation', {
      directive: event.effectiveDirective,
      blocked: bare(event.blockedURI),
      source: bare(event.sourceFile),
      line: event.lineNumber,
      column: event.columnNumber,
      disposition: event.disposition,
    });
  });
})();
