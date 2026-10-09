import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCheckMacValue } from "@/lib/ecpay";

// Background notification (ECPay calls it ReturnURL).
// The payment provider's server calls our backend directly. Updating the order and
// upgrading the membership happen only here.
// Responding "1|OK" means "received". Without it, ECPay sends the notification again later.

const OK = () => new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
const FAIL = (reason: string) =>
  new Response(`0|${reason}`, { status: 400, headers: { "Content-Type": "text/plain" } });

export async function POST(request: Request) {
  const body = await request.text();
  const params = Object.fromEntries(new URLSearchParams(body)) as Record<string, string>;
  const tradeNo = params.MerchantTradeNo;

  console.log("Payment notification received", tradeNo, "RtnCode", params.RtnCode);

  // 1. Verify the source: the CheckMacValue must match
  if (!verifyCheckMacValue(params)) {
    console.warn("CheckMacValue mismatch, ignoring notification", tradeNo);
    return FAIL("CheckMacValue error");
  }

  const admin = createAdminClient();

  // Keep the raw notification (no card data) for troubleshooting and replays
  await admin.from("payment_notifications").insert({ trade_no: tradeNo, payload: params });

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, amount, status")
    .eq("trade_no", tradeNo)
    .maybeSingle();

  if (!order) {
    console.warn("Order not found", tradeNo);
    return FAIL("Order not found");
  }

  // 2. Compare the amount against our own order
  if (Number(params.TradeAmt) !== order.amount) {
    console.warn("Amount mismatch", tradeNo, "notification", params.TradeAmt, "order", order.amount);
    return FAIL("Amount mismatch");
  }

  // Failed payments also send notifications: only upgrade on success
  if (params.RtnCode !== "1") {
    console.log("Payment not successful, order stays pending", tradeNo, params.RtnMsg);
    return OK();
  }

  // Duplicate notification: already handled, just acknowledge it
  if (order.status === "paid") {
    console.log("Order already paid, skipping", tradeNo);
    return OK();
  }

  // 3. Update and upgrade. The status = 'pending' condition makes sure that even if
  //    two notifications arrive at the same time, only one of them succeeds.
  const now = new Date().toISOString();
  const { data: updated } = await admin
    .from("orders")
    .update({ status: "paid", paid_at: now, gateway_trade_no: params.TradeNo })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");

  if (!updated || updated.length === 0) {
    console.log("Order already paid, skipping", tradeNo);
    return OK();
  }

  await admin
    .from("membership_upgrades")
    .upsert({ user_id: order.user_id, order_id: order.id }, { onConflict: "order_id", ignoreDuplicates: true });
  await admin.from("profiles").update({ is_paid: true, paid_at: now }).eq("id", order.user_id);

  console.log("Order marked as paid", tradeNo);
  return OK();
}
