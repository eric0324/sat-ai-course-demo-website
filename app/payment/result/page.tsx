import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Where the user lands after paying. This page only displays the result.
// The status always comes from the database, which is updated by the background
// notification. Parameters sent back with the browser are not trusted.
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ trade_no?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/member");

  const { trade_no } = await searchParams;
  const { data: order } = trade_no
    ? await supabase.from("orders").select("trade_no, status").eq("trade_no", trade_no).maybeSingle()
    : { data: null };

  return (
    <>
      <h1>Payment result</h1>
      {order?.status === "paid" ? (
        <div className="notice ok">Payment successful. Your membership has been upgraded.</div>
      ) : order?.status === "pending" ? (
        <div className="notice warn">
          Payment not completed. You can try again. If you just paid, we may still be waiting for the
          payment provider&apos;s confirmation. Please refresh in a moment.
        </div>
      ) : (
        <div className="notice warn">Order not found.</div>
      )}
      <p>
        <Link href="/member" className="button">
          Back to Member Area
        </Link>{" "}
        <Link href="/orders" className="button secondary">
          View my orders
        </Link>
      </p>
    </>
  );
}
