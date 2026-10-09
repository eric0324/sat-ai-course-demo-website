// Replay a payment notification: resend the first notification received for an order
// to the backend, exactly as it was. Useful for testing duplicate notifications.
//
// Usage: npm run replay-notify -- <order number> [target URL]
//   Without a target URL, it sends to SITE_URL from .env.local.
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from "@supabase/supabase-js";

const [tradeNo, targetArg] = process.argv.slice(2);
if (!tradeNo) {
  console.error("Usage: npm run replay-notify -- <order number> [target URL]");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase
  .from("payment_notifications")
  .select("payload, received_at")
  .eq("trade_no", tradeNo)
  .order("received_at", { ascending: true })
  .limit(1)
  .maybeSingle();

if (error || !data) {
  console.error("No payment notification found for this order", error?.message ?? "");
  process.exit(1);
}

const base = (targetArg || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const url = `${base}/api/payment/notify`;

console.log(`Replaying notification for ${tradeNo} (received ${data.received_at}) to ${url}`);
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(data.payload).toString(),
});
console.log("Backend response:", response.status, await response.text());
