// Edge function: proxies River AI chat completions with server-side API key.
// verify_jwt = false so the anon-key frontend can call it.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RIVER_BASE_URL = "https://api.river.ai/v1";
const RIVER_MODEL = "deepseek-ai/DeepSeek-V4.1-Flash";

const SYSTEM_PROMPT =
  "You are Forge Strategist, the System-2 agent inside LockedIn. You synthesize a precise " +
  "proof-of-work dossier for a specific builder. Use only the supplied telemetry. Never invent " +
  "metrics, repos, or credentials. Write 6-9 short lines in a calm, precise research-editorial " +
  "voice. Open with the Jev classification. Name one flagship artifact, one stack move, one gap " +
  "patch, and one target-specific first action. No markdown headings. No emojis.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userPrompt: string | undefined = body?.prompt;

    if (!userPrompt || typeof userPrompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'prompt' in request body." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RIVER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "River AI API key not configured on the server." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`${RIVER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: RIVER_MODEL,
        stream: true,
        temperature: 0.5,
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `River AI ${response.status}: ${text.slice(0, 220)}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.body) {
      return new Response(JSON.stringify({ error: "River AI returned an empty stream." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
