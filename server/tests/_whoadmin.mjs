const BASE = "http://localhost:5000";

async function probe(username) {
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "123456789" }),
  });
  const body = await res.json().catch(() => ({}));
  const name = body.user?.name;
  const message = body.error?.message || body.message;
  console.log(`${username} -> ${res.status} name=${name || "-"} msg=${message || "-"}`);
}

await probe("zzz-not-an-admin");
await probe("jonathan");
