export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { query, lat, lng } = req.body;
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) return res.status(500).json({ error: "Anthropic key not configured on server" });
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Find products in physical walk-in shops in Slovakia near Michalovce. Search tesco.sk, lidl.sk, kaufland.sk, dm.sk, action.com, intersport.sk, bardiauto.sk. Return ONLY JSON array (no markdown): [{"shopName":"Tesco","address":"Nábrežná 1, Michalovce","productName":"name","price":9.99,"status":"in_stock","mapsUrl":"https://maps.google.com/?q=Tesco+Michalovce"}]. status: in_stock | check_in_store. Physical stores only. Max 5 results. Empty [] if nothing found.`,
        messages: [{ role: "user", content: `Search for "${query}" near Michalovce Slovakia. Lat:${lat} Lng:${lng}` }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Anthropic error" });

    const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("") || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    const results = start === -1 ? [] : JSON.parse(clean.slice(start, end + 1));
    res.status(200).json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
