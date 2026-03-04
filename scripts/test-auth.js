

const BASE_URL = 'http://localhost:5000';

async function testAuth() {
  const username = `testuser_${Date.now()}`;
  const password = 'password123';

  console.log(`[TEST] Starting auth test for user: ${username}`);

  // 1. Signup
  console.log('[TEST] 1. Testing Signup...');
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (signupRes.status !== 201) {
    const text = await signupRes.text();
    console.error(`[FAIL] Signup failed: ${signupRes.status} - ${text}`);
    return;
  }

  const signupData = await signupRes.json();
  const token = signupData.token;
  console.log('[PASS] Signup successful. Token received.');

  // 2. Verify /api/auth/me with token
  console.log('[TEST] 2. Testing /api/auth/me with token...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (meRes.status !== 200) {
    const text = await meRes.text();
    console.error(`[FAIL] /api/auth/me failed: ${meRes.status} - ${text}`);
    return;
  }

  const meData = await meRes.json();
  if (meData.user.username !== username) {
    console.error(`[FAIL] Username mismatch. Expected ${username}, got ${meData.user.username}`);
    return;
  }
  console.log('[PASS] /api/auth/me successful.');

  // 3. Login (using same credentials)
  console.log('[TEST] 3. Testing Login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (loginRes.status !== 200) {
    const text = await loginRes.text();
    console.error(`[FAIL] Login failed: ${loginRes.status} - ${text}`);
    return;
  }
  
  const loginData = await loginRes.json();
  if (!loginData.token) {
     console.error(`[FAIL] Login did not return token`);
     return;
  }
  console.log('[PASS] Login successful.');

  // 4. Logout
  console.log('[TEST] 4. Testing Logout...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (logoutRes.status !== 200) {
      console.error(`[FAIL] Logout failed: ${logoutRes.status}`);
  } else {
      console.log('[PASS] Logout successful.');
  }

  console.log('[TEST] All tests passed!');
}

testAuth().catch(err => console.error(err));
