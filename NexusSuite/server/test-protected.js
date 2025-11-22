/**
 * Tests for protected tenant-scoped endpoints with and without JWT
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5051';

async function makeRequest(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json };
}

function randomEmail() {
  const ts = Date.now();
  return `protected_test_${ts}@example.com`;
}

async function getJwt() {
  const email = randomEmail();
  const password = 'P@ssw0rd!';
  const firstName = 'Prot';
  const lastName = 'Tester';
  const tenantName = 'Protected Test Club';
  const reg = await makeRequest('POST', '/api/auth/register', { email, password, firstName, lastName, tenantName });
  if (!reg.ok) throw new Error('Register failed: ' + JSON.stringify(reg.data));
  return reg.data.token;
}

async function run() {
  console.log('🔐 Protected route tests');
  console.log('Base URL:', BASE_URL);

  // Without token
  console.log('\n1) Access without JWT');
  for (const path of ['/api/staff', '/api/payroll', '/api/matches']) {
    const r = await makeRequest('GET', path);
    console.log(`   ${path} -> ${r.status}`);
    if (r.status !== 401) throw new Error(`Expected 401 for ${path} without token`);
  }

  // With token
  console.log('\n2) Access with JWT');
  const token = await getJwt();
  for (const path of ['/api/staff', '/api/payroll', '/api/matches']) {
    const r = await makeRequest('GET', path, null, token);
    console.log(`   ${path} -> ${r.status}`);
    if (r.status !== 200) throw new Error(`Expected 200 for ${path} with token, got ${r.status}`);
  }

  console.log('\n✅ Protected route tests completed');
}

run().catch(err => {
  console.error('❌ Protected route tests failed:', err.message);
  process.exit(1);
});