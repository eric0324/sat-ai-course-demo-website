import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCheckoutForm, generateTradeNo } from "@/lib/ecpay";
import { PLAN } from "@/lib/plan";
import { getSiteUrl } from "@/lib/site-url";

// "Upgrade" button: create a pending order, then send the user to the payment page.
export async function POST(request: Request) {
  // Check again on the server: is this user signed in?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/member", request.url), { status: 303 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_paid) {
    return NextResponse.redirect(new URL("/member", request.url), { status: 303 });
  }

  const tradeNo = generateTradeNo();
  const { error } = await admin.from("orders").insert({
    trade_no: tradeNo,
    user_id: user.id,
    amount: PLAN.amount, // the server decides the amount
    status: "pending",
  });
  if (error) {
    console.error("Failed to create order", error.message);
    return new NextResponse("Couldn't create the order. Please try again later.", { status: 500 });
  }
  console.log("Order created", tradeNo);

  const html = buildCheckoutForm({
    tradeNo,
    amount: PLAN.amount,
    itemName: PLAN.name,
    siteUrl: getSiteUrl(request),
  });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
