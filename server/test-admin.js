const fetch = require('node-fetch') || globalThis.fetch;
const API = 'http://localhost:5000/api';

async function test() {
  console.log('--- 1. Not logged in GET /api/admin/users ---');
  let res = await fetch(`${API}/admin/users`);
  console.log(`Status: ${res.status}`);
  console.log(`Body:`, await res.json());

  console.log('\n--- 2. Student Login ---');
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@example.com', password: 'CampusCoin2026!' })
  });
  console.log(`Status: ${res.status}`);
  const studentCookie = res.headers.get('set-cookie');

  console.log('\n--- 3. Student GET /api/admin/users ---');
  res = await fetch(`${API}/admin/users`, { headers: { 'Cookie': studentCookie } });
  console.log(`Status: ${res.status}`);
  console.log(`Body:`, await res.json());

  console.log('\n--- 4. Admin Login ---');
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campuscoin.test', password: 'AdminCampus2026!' })
  });
  console.log(`Status: ${res.status}`);
  const adminCookie = res.headers.get('set-cookie');

  console.log('\n--- 5. Admin GET /api/admin/stats ---');
  res = await fetch(`${API}/admin/stats`, { headers: { 'Cookie': adminCookie } });
  console.log(`Status: ${res.status}`);
  console.log(`Body:`, await res.json());
}

test();
