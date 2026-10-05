// POST /api/calls — start a Hunar voice call
const HUNAR_BASE = "https://api.voice.hunar.ai/external/v1";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    if (!process.env.HUNAR_API_KEY) {
      return Response.json({ error: "HUNAR_API_KEY is not set in Vercel Environment Variables" }, { status: 500 });
    }
    try {
      const body = await request.json();
      const resp = await fetch(`${HUNAR_BASE}/calls/`, {
        method: "POST",
        headers: { "X-API-Key": process.env.HUNAR_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return new Response(await resp.text(), {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
};
