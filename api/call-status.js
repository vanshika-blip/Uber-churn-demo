// GET /api/call-status?id=<callId> — check a call's status and result
const HUNAR_BASE = "https://api.voice.hunar.ai/external/v1";

export default {
  async fetch(request) {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    try {
      const resp = await fetch(`${HUNAR_BASE}/calls/${encodeURIComponent(id)}/`, {
        headers: { "X-API-Key": process.env.HUNAR_API_KEY },
      });
      return new Response(await resp.text(), {
        status: resp.status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
};
