export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name } = req.body;
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) return res.status(500).json({ error: "Anthropic key not configured on server" });
  if (!name) return res.status(400).json({ error: "Missing product name" });

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
        max_tokens: 300,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Find a product image URL. Return ONLY JSON (no markdown): {"imageUrl":"https://...","description":"short description"}. Direct image URL (.jpg .png .webp). If not found: {"imageUrl":"","description":""}`,
        messages: [{ role: "user", content: `Find product image: ${name}` }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Anthropic error" });

    const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("") || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    res.status(200).json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: e.message, imageUrl: "", description: "" });
  }
}
