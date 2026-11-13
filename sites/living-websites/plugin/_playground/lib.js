// Shared helpers for the local Playground tests.
const BASE = 'http://127.0.0.1:9400';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
async function tool(a, extra = '') { const r = await fetch(`${BASE}/test-tools/tool.php?a=${a}${extra}`, { headers: { cookie: 'playground_auto_login_already_happened=1' } }); return r.text(); }
async function run(f, q = '') { return tool('run', `&f=${f}${q}`); }
// Admin session: returns {cookie, nonce, api(method, path, body)}
async function admin(user = 'admin', pass = 'password') {
  const jar = {}; const take = (r) => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1); } };
  const ck = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  jar.playground_auto_login_already_happened = '1'; jar['wordpress_test_cookie'] = 'WP%20Cookie%20check';
  const r = await fetch(`${BASE}/wp-login.php`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: ck() }, body: `log=${encodeURIComponent(user)}&pwd=${encodeURIComponent(pass)}&wp-submit=Log+In&testcookie=1` });
  take(r);
  const n = await (await fetch(`${BASE}/wp-admin/admin-ajax.php?action=rest-nonce`, { headers: { cookie: ck() } })).text();
  const api = async (method, path, body) => {
    const res = await fetch(`${BASE}/index.php?rest_route=/spark-living/v1${path}`, { method, headers: { cookie: ck(), 'x-wp-nonce': n, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: res.status, body: j, headers: res.headers };
  };
  return { cookie: ck, nonce: n, api, jar };
}
// ---- Assertions for the t10+ tests: check(name, ok, detail), then summary() exits non-zero on any failure.
let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log('PASS  ' + name); } else { failed++; console.log('FAIL  ' + name + (detail !== '' ? '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']' : '')); }
}
function summary(label) {
  console.log(`
${label}: ${passed} passed, ${failed} failed`);
  return failed === 0;
}
// Rows from the events table for a visitor id (or any WHERE clause).
async function events(where) {
  const t = await tool('sql', '&q=' + encodeURIComponent(`SELECT experiment_id, variant, visitor_id, event_type FROM wp_spark_living_events WHERE ${where} ORDER BY id`));
  try { return JSON.parse(t.slice(0, t.lastIndexOf(']') + 1)); } catch { return []; }
}
// Random 16-char hex visitor id.
function hex16() { let s = ''; while (s.length < 16) s += Math.floor(Math.random() * 16).toString(16); return s; }
// Reset the test state (no running test, no promoted winners) without writing log entries.
async function cleanup(clearEvents = false) { return run('cleanup.php', clearEvents ? '&events=1' : ''); }
module.exports = { BASE, UA, tool, run, admin, check, summary, events, hex16, cleanup };
