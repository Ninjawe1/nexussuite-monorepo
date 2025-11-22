/**
 * Tests for Clerk webhook endpoint signature verification and error handling
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5051';

async function postWebhook(payload, headers = {}) {
  const res = await fetch(`${BASE_URL}/api/webhooks/clerk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json };
}

async function run() {
  console.log('🧪 Webhook endpoint tests');
  console.log('Base URL:', BASE_URL);

  const testPayload = {
    type: 'user.created',
    data: {
      id: 'test_user_id',
      email_addresses: [{ email_address: 'webhook_test@example.com' }],
      first_name: 'Hook',
      last_name: 'Tester',
      image_url: null,
    }
  };

  // 1) Missing headers should 400
  console.log('\n1) Missing Svix headers');
  const r1 = await postWebhook(testPayload);
  console.log('   Status:', r1.status);
  if (r1.status !== 400) throw new Error('Expected 400 for missing Svix headers');

  // 2) Invalid signature should 400 or 500 depending on server error handling
  console.log('\n2) Invalid signature');
  const r2 = await postWebhook(testPayload, {
    'svix-id': 'msg_test_1',
    'svix-timestamp': String(Math.floor(Date.now() / 1000)),
    'svix-signature': 'v1,invalidsignature'
  });
  console.log('   Status:', r2.status);
  if (![400, 500].includes(r2.status)) throw new Error('Expected 400 or 500 for invalid signature');

  // 3) Secret missing on server should 500 (skip if already configured)
  console.log('\n3) Secret configured check');
  const r3 = await postWebhook(testPayload, {
    'svix-id': 'msg_test_2',
    'svix-timestamp': String(Math.floor(Date.now() / 1000)),
    'svix-signature': 'v1,invalidsignature'
  });
  if (r3.status === 500) {
    console.log('   ⚠️ Server reports webhook secret not configured (500).');
  } else if (r3.status === 400) {
    console.log('   ✅ Server is enforcing signature verification.');
  } else {
    console.log('   ℹ️ Unexpected status:', r3.status);
  }

  console.log('\n✅ Webhook tests completed');
}

run().catch(err => {
  console.error('❌ Webhook tests failed:', err.message);
  process.exit(1);
});