const BASE = "http://localhost:5012";

async function login(username, password) {
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => ({}));
  let meName = "-";
  if (res.ok) {
    const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
    const me = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } });
    const meBody = await me.json().catch(() => ({}));
    meName = meBody.user?.name ?? "null";
  }
  const reported = body.user?.name ?? body.error?.message ?? "-";
  const shownPassword = password === "123456789" ? "<real>" : "<wrong>";
  console.log(`${username} ${shownPassword} -> ${res.status} login=${reported} header=${meName}`);
}

await login("jonathan", "123456789");
await login("senod", "123456789");
await login("zzz-not-an-admin", "123456789");
await login("jonathan", "wrong-password");
