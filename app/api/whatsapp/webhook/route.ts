import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { ok: false, error: "Webhook verification failed" },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!(await isValidSignature(rawBody, signature))) {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  let payload: unknown = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook JSON" },
      { status: 400 },
    );
  }

  // TODO: Normalize and enqueue inbound WhatsApp messages after Meta verifies
  // the webhook in the console. For now, acknowledge quickly so Meta does not retry.
  void payload;

  return NextResponse.json({ ok: true });
}

async function isValidSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = `sha256=${hex(new Uint8Array(digest))}`;

  return timingSafeStringEqual(signature, expected);
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeStringEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
