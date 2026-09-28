const fetch = globalThis.fetch;
const API = 'http://localhost:5005/api';

async function run() {
  const adminLogin = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campuscoin.test', password: 'AdminCampus2026!' })
  });
  const adminCookie = adminLogin.headers.get('set-cookie');
  const adminResData = await adminLogin.json();
  const adminId = adminResData.user.user_id;

  const studentCreds = { email: 'alex@example.com', password: 'CampusCoin2026!' };

  console.log('\n--- A. GET /api/admin/stats ---');
  let res = await fetch(API + '/admin/stats', { headers: { 'Cookie': adminCookie } });
  console.log(JSON.stringify(await res.json(), null, 2));

  console.log('\n--- B. Disable flow ---');
  let studentLogin = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentCreds)
  });
  const oldStudentCookie = studentLogin.headers.get('set-cookie');
  const studentData = await studentLogin.json();
  const studentId = studentData.user.user_id;

  await fetch(`${API}/admin/users/${studentId}/disable`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie }
  });
  console.log('Admin disabled student.');

  res = await fetch(`${API}/auth/me`, { headers: { 'Cookie': oldStudentCookie } });
  console.log('Protected route with old cookie (me):', res.status);

  res = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentCreds)
  });
  console.log('Login attempt while disabled:', res.status, await res.json());

  await fetch(`${API}/admin/users/${studentId}/disable`, {
    method: 'PUT',
    headers: { 'Cookie': adminCookie }
  });
  console.log('Admin enabled student.');

  res = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentCreds)
  });
  console.log('Login attempt after enable:', res.status);
  const newStudentCookie = res.headers.get('set-cookie');

  console.log('\n--- C. Admin tries to disable/reset themselves ---');
  res = await fetch(`${API}/admin/users/${adminId}/disable`, { method: 'PUT', headers: { 'Cookie': adminCookie } });
  console.log('Disable self:', res.status, await res.json());

  res = await fetch(`${API}/admin/users/${adminId}/reset`, { method: 'PUT', headers: { 'Cookie': adminCookie } });
  console.log('Reset self:', res.status, await res.json());

  console.log('\n--- D. Categories ---');
  let cats = await fetch(`${API}/admin/categories`, { headers: { 'Cookie': adminCookie } }).then(r => r.json());
  const foodCat = cats.find(c => c.name === 'Food');
  res = await fetch(`${API}/admin/categories/${foodCat._id}`, { method: 'DELETE', headers: { 'Cookie': adminCookie } });
  console.log('Delete default category with transactions:', res.status, await res.json());

  res = await fetch(`${API}/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ name: 'TestCat', type: 'expense' })
  });
  const newCat = await res.json();
  res = await fetch(`${API}/admin/categories/${newCat._id}`, { method: 'DELETE', headers: { 'Cookie': adminCookie } });
  console.log('Delete unused category:', res.status, await res.json());

  console.log('\n--- E. Reset ---');
  res = await fetch(`${API}/transactions?month=2026-09`, { headers: { 'Cookie': newStudentCookie } });
  const txBefore = (await res.json()).length;
  console.log('Transactions before reset:', txBefore);

  res = await fetch(`${API}/admin/users/${studentId}/reset`, { method: 'PUT', headers: { 'Cookie': adminCookie } });
  const resetData = await res.json();
  console.log('Reset response:', resetData);

  res = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentCreds)
  });
  console.log('Login with old password:', res.status);

  const newCreds = { email: 'alex@example.com', password: resetData.temporaryPassword };
  studentLogin = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCreds)
  });
  console.log('Login with temp password:', studentLogin.status);
  const resetStudentCookie = studentLogin.headers.get('set-cookie');

  res = await fetch(`${API}/transactions?month=2026-09`, { headers: { 'Cookie': resetStudentCookie } });
  console.log('Transactions after reset:', (await res.json()).length);

  console.log('\n--- F. TipTemplate & Announcements ---');
  res = await fetch(`${API}/admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ title: 'Welcome', body: 'Hello world', active: true })
  });
  const ann1 = await res.json();
  res = await fetch(`${API}/admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ title: 'Hidden', body: 'Secret', active: false })
  });
  console.log('Created 2 announcements (1 active, 1 inactive).');

  res = await fetch(`${API}/announcements`, { headers: { 'Cookie': resetStudentCookie } });
  const studentAnns = await res.json();
  console.log('Student GET announcements (active only):', studentAnns.map(a => a.title));
}
run().catch(console.error);
