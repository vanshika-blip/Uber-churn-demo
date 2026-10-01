// src/index.js — Cloudflare Worker with Assets binding
// Handles /api/* routes server-side, falls through to static assets for everything else

const HUNAR_BASE = "https://api.voice.hunar.ai/external/v1";
const SHEET_ID = "1qWhulUUTOM8x78JPl8TyhhQk59vq41f5dNBSXou6NFQ";
const SHEET_RANGE = "Sheet1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Build a signed JWT and exchange it for a Google OAuth access token
async function getGoogleToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const b64url = (s) =>
    btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const sigInput = `${header}.${claim}`;

  const pemBody = sa.private_key
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const sigBytes = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(sigInput))
  );
  let sigBinary = "";
  sigBytes.forEach((b) => (sigBinary += String.fromCharCode(b)));
  const jwt = `${sigInput}.${b64url(sigBinary)}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const { access_token, error } = await resp.json();
  if (error) throw new Error(`Google token error: ${error}`);
  return access_token;
}

async function sheetsAppend(accessToken, rows) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: rows }),
  });
  if (!resp.ok) throw new Error(`Sheets API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export default {
  async fetch(request, env) {
    const HUNAR_API_KEY = env.HUNAR_API_KEY;
    const url = new URL(request.url);

    // ── OPTIONS preflight for /api/* ──
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── POST /api/calls — Create a call ──
    if (url.pathname === "/api/calls" && request.method === "POST") {
      try {
        const body = await request.json();
        const resp = await fetch(`${HUNAR_BASE}/calls/`, {
          method: "POST",
          headers: { "X-API-Key": HUNAR_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await resp.text();
        return new Response(data, {
          status: resp.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err) {
        return jsonResp({ error: err.message }, 500);
      }
    }

    // ── GET /api/calls/:id — Poll call status ──
    if (url.pathname.startsWith("/api/calls/") && request.method === "GET") {
      const callId = url.pathname.replace("/api/calls/", "").replace(/\/$/, "");
      try {
        const resp = await fetch(`${HUNAR_BASE}/calls/${callId}/`, {
          headers: { "X-API-Key": HUNAR_API_KEY },
        });
        const data = await resp.text();
        return new Response(data, {
          status: resp.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err) {
        return jsonResp({ error: err.message }, 500);
      }
    }

    // ── POST /api/log — Append completed call row to Google Sheet ──
    if (url.pathname === "/api/log" && request.method === "POST") {
      try {
        const d = await request.json();
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
        const token = await getGoogleToken(sa);

        const r = d.result && typeof d.result === "object" ? d.result : {};

        const row = [
          new Date().toISOString(),                                              // Logged At
          d.id || "",                                                            // Call ID
          d.callee_name || "",                                                   // Name
          d.mobile_number || "",                                                 // Number
          d.language || "",                                                      // Language
          (d.status || "").toUpperCase(),                                        // Status
          d.engagement_status || "",                                             // Engagement
          d.duration_seconds != null ? d.duration_seconds : "",                 // Duration (s)
          d.user_speech_duration != null ? d.user_speech_duration : "",         // User Speech (s)
          d.answered_by || "",                                                   // Answered By
          d.call_ended_by || "",                                                 // Call Ended By
          d.started_at || "",                                                    // Started At
          d.ended_at || "",                                                      // Ended At
          d.recording_url || "",                                                 // Recording URL
          r.interest_status || "",                                               // Interest Status
          r.reason_category || "",                                               // Reason Category
          r.reason_detail || "",                                                 // Reason Detail
          r.callback_required || "",                                             // Callback Required
          r.callback_date || "",                                                 // Callback Date
          r.callback_time || "",                                                 // Callback Time
          r.call_date || "",                                                     // Call Date
          r.not_interested_reason || "",                                         // Not Interested Reason
          r.faq_questions_asked || "",                                           // FAQ Questions Asked
          r.call_outcome_notes || "",                                            // Call Outcome Notes
          r.account_manager_callback || "",                                      // Account Manager Callback
        ];

        await sheetsAppend(token, [row]);
        return jsonResp({ ok: true });
      } catch (err) {
        console.error("Sheet log error:", err.message);
        return jsonResp({ error: err.message }, 500);
      }
    }

    // ── GET /api/sheets/init — Write header row (run once to set up the sheet) ──
    if (url.pathname === "/api/sheets/init" && request.method === "GET") {
      try {
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
        const token = await getGoogleToken(sa);
        await sheetsAppend(token, [[
          "Logged At", "Call ID", "Name", "Number", "Language",
          "Status", "Engagement", "Duration (s)", "User Speech (s)",
          "Answered By", "Call Ended By", "Started At", "Ended At",
          "Recording URL",
          "Interest Status", "Reason Category", "Reason Detail",
          "Callback Required", "Callback Date", "Callback Time",
          "Call Date", "Not Interested Reason", "FAQ Questions Asked",
          "Call Outcome Notes", "Account Manager Callback",
        ]]);
        return jsonResp({ ok: true, message: "Header row written to sheet" });
      } catch (err) {
        return jsonResp({ error: err.message }, 500);
      }
    }

    // ── Everything else → static assets (index.html etc.) ──
    return env.ASSETS.fetch(request);
  },
};
