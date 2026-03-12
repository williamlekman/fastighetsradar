const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(method, table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": method === "POST" ? "resolution=merge-duplicates" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, table, data } = req.body;

  try {
    if (action === "upsert") {
      // Insert or update rows
      const rows = Array.isArray(data) ? data : [data];
      await supabase("POST", `${table}?on_conflict=id`, rows);
      return res.status(200).json({ ok: true });
    }

    if (action === "get") {
      const rows = await supabase("GET", `${table}?select=*&order=created_at.desc`);
      return res.status(200).json(rows);
    }

    if (action === "delete") {
      await supabase("DELETE", `${table}?id=eq.${data.id}`);
      return res.status(200).json({ ok: true });
    }

    if (action === "clear") {
      await supabase("DELETE", `${table}?id=neq.-1`);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
