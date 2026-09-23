async function run() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_zalo: '0123456789', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const res = await fetch('http://localhost:5000/api/admin/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'TEST SESSION NO DATE_TIME',
      location: 'Location',
      session_start: '2026-09-20T17:00'
    })
  });
  const data = await res.json();
  console.log(data);
}
run();
