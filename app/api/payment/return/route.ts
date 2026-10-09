import { NextResponse } from "next/server";

// After paying, ECPay sends the user's browser here (OrderResultURL).
// Nothing is updated here. We only redirect to the result page, which reads the database.
export async function POST(request: Request) {
  const form = await request.formData();
  const tradeNo = String(form.get("MerchantTradeNo") ?? "");
  const url = new URL("/payment/result", request.url);
  if (tradeNo) url.searchParams.set("trade_no", tradeNo);
  return NextResponse.redirect(url, { status: 303 });
}
