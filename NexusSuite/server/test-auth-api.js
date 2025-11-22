/**
 * End-to-end tests for JWT auth API: register, login, user, logout
 * Assumes dev server running locally (Express + Vite) and storage mocked or connected.
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
  return `auth_test_${ts}@example.com`;
}

async function run() {
  console.log('🚀 JWT Auth API E2E Tests');
  console.log('Base URL:', BASE_URL);

  const email = randomEmail();
  const password = 'P@ssw0rd!';
  const firstName = 'Test';
  const lastName = 'User';
  const tenantName = 'Auth Test Club';

  // 1) Register
  console.log('\n1) Register user');
  const reg = await makeRequest('POST', '/api/auth/register', { email, password, firstName, lastName, tenantName });
  console.log('   Status:', reg.status, 'OK:', reg.ok);
  if (!reg.ok) throw new Error('Register failed: ' + JSON.stringify(reg.data));
  const regToken = reg.data?.token;
  const regUser = reg.data?.user;
  if (!regToken || !regUser) throw new Error('Register response missing token/user');
  console.log('   User ID:', regUser.id, 'Tenant:', regUser.tenantId);

  // 2) /api/auth/user with token
  console.log('\n2) Fetch /api/auth/user with JWT');
  const me = await makeRequest('GET', '/api/auth/user', null, regToken);
  console.log('   Status:', me.status, 'OK:', me.ok);
  if (!me.ok) throw new Error('Auth user failed: ' + JSON.stringify(me.data));
  console.log('   Email:', me.data.email, 'Role:', me.data.role);

  // 3) Login
  console.log('\n3) Login existing user');
  const login = await makeRequest('POST', '/api/auth/login', { email, password });
  console.log('   Status:', login.status, 'OK:', login.ok);
  if (!login.ok) throw new Error('Login failed: ' + JSON.stringify(login.data));
  const loginToken = login.data?.token;
  if (!loginToken) throw new Error('Login response missing token');

  // 4) /api/auth/user with login token
  console.log('\n4) Fetch /api/auth/user with login JWT');
  const me2 = await makeRequest('GET', '/api/auth/user', null, loginToken);
  console.log('   Status:', me2.status, 'OK:', me2.ok);
  if (!me2.ok) throw new Error('Auth user (login) failed: ' + JSON.stringify(me2.data));

  // 5) Logout
  console.log('\n5) Logout');
  const logout = await makeRequest('POST', '/api/auth/logout', null, loginToken);
  console.log('   Status:', logout.status, 'OK:', logout.ok);
  if (!logout.ok) throw new Error('Logout failed: ' + JSON.stringify(logout.data));

  // 6) Access protected after logout (should still work with JWT if stateless)
  console.log('\n6) Access protected endpoint with old JWT');
  const meAfterLogout = await makeRequest('GET', '/api/auth/user', null, loginToken);
  console.log('   Status:', meAfterLogout.status, 'OK:', meAfterLogout.ok);
  if (!meAfterLogout.ok) {
    console.log('   ✅ Server rejects after logout or invalidates session.');
  } else {
    console.log('   ⚠️ Still accessible via JWT; server treats JWT stateless.');
  }

  // 7) Protected route access without token
  console.log('\n7) Access protected without token');
  const meNoToken = await makeRequest('GET', '/api/auth/user');
  console.log('   Status:', meNoToken.status, 'OK:', meNoToken.ok);
  if (meNoToken.status !== 401) throw new Error('Expected 401 for unauthenticated access');

  console.log('\n✅ Auth API tests completed successfully');
}

run().catch(err => {
  console.error('❌ Auth API tests failed:', err.message);
  process.exit(1);
});