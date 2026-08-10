/**
 * send-push-notifications
 *
 * Server-side Web Push sender. Can be triggered:
 *   1. By Supabase pg_cron (schedule) — runs automatically e.g. every hour
 *   2. By a direct POST from the frontend (on-demand / test)
 *
 * For each pharmacy it:
 *   1. Loads all push_subscriptions for users belonging to that pharmacy
 *   2. Queries the medication table for critical conditions:
 *      - Expired medications
 *      - Medications expiring within 30 days
 *      - Out-of-stock items
 *      - Low-stock items (below reorder level)
 *   3. Sends an OS push notification to every subscribed device using
 *      the Web Push Protocol (RFC 8030) with VAPID authentication.
 *
 * Environment variables required (set in Supabase dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL                 — auto-provided
 *   SUPABASE_SERVICE_ROLE_KEY    — auto-provided
 *   VAPID_PUBLIC_KEY             — base64url EC P-256 public key
 *   VAPID_PRIVATE_KEY            — base64url EC P-256 private key
 *   VAPID_SUBJECT                — mailto: or https: contact URL e.g. mailto:admin@pharmatrack.app
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { differenceInDays } from "https://esm.sh/date-fns@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── VAPID JWT signing ─────────────────────────────────────────────────────────

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = "";
  arr.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function createVapidJWT(
  audience: string,
  subject: string,
  privateKeyBytes: Uint8Array
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", typ: "JWT" };
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const headerB64 = uint8ArrayToBase64url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const payloadB64 = uint8ArrayToBase64url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the raw EC P-256 private key scalar
  const key = await crypto.subtle.importKey(
    "raw",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(async () => {
    // Fallback: try PKCS8 format if raw fails
    const pkcs8 = buildPKCS8FromRaw(privateKeyBytes);
    return crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  });

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${uint8ArrayToBase64url(new Uint8Array(signature))}`;
}

/** Wrap a 32-byte raw EC private key scalar in a minimal PKCS8 DER envelope */
function buildPKCS8FromRaw(rawPrivKey: Uint8Array): ArrayBuffer {
  // ASN.1 PKCS8 PrivateKeyInfo for EC P-256
  const ecOID = new Uint8Array([0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]); // OID 1.2.840.10045.2.1 (ecPublicKey)
  const p256OID = new Uint8Array([0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]); // OID 1.2.840.10045.3.1.7 (P-256)
  // ECPrivateKey: version(1) + privateKey(32)
  const ecPrivKey = new Uint8Array([
    0x30, 0x41,             // SEQUENCE
    0x02, 0x01, 0x01,       // INTEGER version = 1
    0x04, 0x20, ...rawPrivKey, // OCTET STRING (32 bytes)
    0xa0, 0x0a,             // [0] EXPLICIT
    0x06, 0x08, ...p256OID,  // OID P-256
  ]);
  const algID = new Uint8Array([
    0x30, 0x13,             // SEQUENCE (AlgorithmIdentifier)
    0x06, 0x07, ...ecOID,   // OID ecPublicKey
    0x06, 0x08, ...p256OID, // OID P-256
  ]);
  const inner = new Uint8Array([
    0x02, 0x01, 0x00,       // INTEGER version = 0
    ...algID,
    0x04, ecPrivKey.length, ...ecPrivKey, // OCTET STRING
  ]);
  const total = new Uint8Array([0x30, inner.length, ...inner]);
  return total.buffer;
}

// ─── Web Push encryption helpers ──────────────────────────────────────────────

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const privKeyBytes = base64urlToUint8Array(vapidPrivateKey);
  let jwt: string;
  try {
    jwt = await createVapidJWT(audience, vapidSubject, privKeyBytes);
  } catch (e) {
    console.error("[send-push] JWT creation failed:", e);
    throw e;
  }

  // Encode payload as UTF-8 bytes
  const payloadBytes = new TextEncoder().encode(payload);

  // ── ECDH key exchange for payload encryption (Web Push / RFC 8291) ──────────
  // Generate a local ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import the subscription's receiver public key
  const receiverPubKey = await crypto.subtle.importKey(
    "raw",
    base64urlToUint8Array(subscription.p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret via ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: receiverPubKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Salt (16 random bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Auth secret from subscription
  const authSecret = base64urlToUint8Array(subscription.auth_key);

  // HKDF-SHA-256 to derive the content encryption key + nonce
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await hkdf(sharedSecret, authSecret, authInfo, 32);

  const keyInfo = buildInfo("aesgcm", base64urlToUint8Array(subscription.p256dh), localPublicKeyBytes);
  const nonceInfo = buildInfo("nonce", base64urlToUint8Array(subscription.p256dh), localPublicKeyBytes);

  const contentKey = await hkdf(prk, salt, keyInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  // Encrypt payload with AES-GCM
  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  // Pad payload to prevent length-based fingerprinting (add 2-byte length prefix per RFC 8291)
  const padded = new Uint8Array(2 + payloadBytes.length);
  padded.set(payloadBytes, 2);

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );

  // Build request
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Encoding": "aesgcm",
    "Authorization": `vapid t=${jwt},k=${vapidPublicKey}`,
    "Encryption": `salt=${uint8ArrayToBase64url(salt)}`,
    "Crypto-Key": `dh=${uint8ArrayToBase64url(localPublicKeyBytes)};p256ecdsa=${vapidPublicKey}`,
    "TTL": "86400",
    "Urgency": "high",
  };

  const resp = await fetch(subscription.endpoint, {
    method: "POST",
    headers,
    body: encrypted,
  });

  const body = await resp.text();
  return { ok: resp.ok, status: resp.status, body };
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt.length ? salt : new Uint8Array(32)));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithByte = new Uint8Array(info.length + 1);
  infoWithByte.set(info);
  infoWithByte[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithByte));
  return okm.slice(0, length);
}

function buildInfo(type: string, receiverPub: Uint8Array, senderPub: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  const typeBytes = enc.encode(`Content-Encoding: ${type}\0`);
  const label = enc.encode("P-256\0");
  const info = new Uint8Array(
    typeBytes.length + label.length + 2 + receiverPub.length + 2 + senderPub.length
  );
  let offset = 0;
  info.set(typeBytes, offset); offset += typeBytes.length;
  info.set(label, offset); offset += label.length;
  // receiver public key length (2 bytes big-endian) + key
  info[offset++] = 0x00; info[offset++] = receiverPub.length;
  info.set(receiverPub, offset); offset += receiverPub.length;
  // sender public key length (2 bytes big-endian) + key
  info[offset++] = 0x00; info[offset++] = senderPub.length;
  info.set(senderPub, offset);
  return info;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@pharmatrack.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role key to bypass RLS (this is a server-side cron job)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Parse optional body (for direct/test push from frontend) ──────────────
    let targetUserId: string | null = null;
    let testPayload: string | null = null;
    try {
      if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        targetUserId = body.user_id ?? null;
        testPayload = body.test_payload ?? null;
      }
    } catch { /* no body */ }

    // ── 1. Load subscriptions ─────────────────────────────────────────────────
    let subsQuery = supabase
      .from("push_subscriptions")
      .select("id, user_id, pharmacy_id, endpoint, p256dh, auth_key");

    if (targetUserId) {
      subsQuery = subsQuery.eq("user_id", targetUserId);
    }

    const { data: subscriptions, error: subsError } = await subsQuery;
    if (subsError) {
      console.error("[send-push] Error loading subscriptions:", subsError);
      return new Response(
        JSON.stringify({ error: "Failed to load subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-push] Processing ${subscriptions.length} subscriptions`);

    // ── 2. Load medications for each unique pharmacy ───────────────────────────
    const pharmacyIds = [...new Set(subscriptions.map((s: any) => s.pharmacy_id))];
    const now = new Date();

    const pharmacyConditions: Record<string, { expired: number; expiringSoon: number; outOfStock: number; lowStock: number; soonestName: string; soonestDays: number }> = {};

    for (const pharmacyId of pharmacyIds) {
      const { data: meds } = await supabase
        .from("medications")
        .select("id, name, current_stock, reorder_level, expiry_date")
        .eq("pharmacy_id", pharmacyId)
        .eq("status", "active");

      if (!meds) continue;

      const expired = meds.filter((m: any) => new Date(m.expiry_date) < now);
      const expiringSoon = meds.filter((m: any) => {
        const d = differenceInDays(new Date(m.expiry_date), now);
        return d >= 0 && d <= 30;
      });
      const outOfStock = meds.filter((m: any) => m.current_stock === 0);
      const lowStock = meds.filter((m: any) => m.current_stock > 0 && m.current_stock <= m.reorder_level);

      // Find soonest expiring name
      const sorted = [...expiringSoon].sort((a: any, b: any) =>
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      );

      pharmacyConditions[pharmacyId] = {
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        soonestName: sorted[0]?.name ?? "",
        soonestDays: sorted[0] ? differenceInDays(new Date(sorted[0].expiry_date), now) : 0,
      };
    }

    // ── 3. Build + send push notifications ───────────────────────────────────
    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions as any[]) {
      const cond = pharmacyConditions[sub.pharmacy_id];
      if (!cond && !testPayload) continue;

      // Build the notification payload JSON
      let pushPayload: string;

      if (testPayload) {
        pushPayload = testPayload;
      } else {
        // Prioritise most critical condition
        let title = "";
        let body = "";
        let url = "/notifications";

        if (cond.expired > 0) {
          title = `🚨 ${cond.expired} Medication${cond.expired > 1 ? "s" : ""} EXPIRED`;
          body = "Remove from shelf immediately. Tap to view inventory.";
          url = "/inventory?filter=expired";
        } else if (cond.outOfStock > 0) {
          title = `📦 ${cond.outOfStock} Item${cond.outOfStock > 1 ? "s" : ""} Out of Stock`;
          body = "Reorder urgently to avoid lost sales.";
          url = "/suppliers";
        } else if (cond.expiringSoon > 0) {
          title = `⚠️ ${cond.expiringSoon} Item${cond.expiringSoon > 1 ? "s" : ""} Expiring Soon`;
          body = `"${cond.soonestName}" expires in ${cond.soonestDays} day${cond.soonestDays !== 1 ? "s" : ""}. Consider promotions.`;
          url = "/notifications?filter=expiring";
        } else if (cond.lowStock > 0) {
          title = `📉 ${cond.lowStock} Item${cond.lowStock > 1 ? "s" : ""} Low on Stock`;
          body = "Items are below reorder level. Time to restock.";
          url = "/suppliers";
        } else {
          // No critical conditions — skip this subscription (no spam)
          continue;
        }

        pushPayload = JSON.stringify({ title, body, url, icon: "/icon-192.png", badge: "/icon-192.png" });
      }

      try {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth_key: sub.auth_key },
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        if (result.ok || result.status === 201) {
          console.log(`[send-push] ✓ Sent to user ${sub.user_id} (status ${result.status})`);
          sent++;
        } else if (result.status === 404 || result.status === 410) {
          // Subscription is expired/unsubscribed — mark for removal
          console.log(`[send-push] Stale subscription for user ${sub.user_id}, removing`);
          staleEndpoints.push(sub.endpoint);
          failed++;
        } else {
          console.error(`[send-push] ✗ Failed for user ${sub.user_id}: HTTP ${result.status} — ${result.body}`);
          failed++;
        }
      } catch (err) {
        console.error(`[send-push] ✗ Error for user ${sub.user_id}:`, err);
        failed++;
      }
    }

    // ── 4. Clean up stale subscriptions ───────────────────────────────────────
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
      console.log(`[send-push] Removed ${staleEndpoints.length} stale subscriptions`);
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications processed",
        sent,
        failed,
        stale_removed: staleEndpoints.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-push] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
