import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Runs daily (see vercel.json): cancels orders that have been pending for over a day.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .select("trade_no");

  if (error) {
    console.error("Failed to cancel expired orders", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  console.log("Cancelled expired orders:", data?.length ?? 0);
  return NextResponse.json({ ok: true, cancelled: data?.length ?? 0 });
}
