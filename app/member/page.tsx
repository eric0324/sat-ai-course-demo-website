import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN } from "@/lib/plan";

// Requires sign-in. The proxy already checks, and we check again on the server here.
export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/member");

  const { payment } = await searchParams;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_paid, paid_at")
    .eq("id", user.id)
    .maybeSingle();

  const isPaid = profile?.is_paid ?? false;

  return (
    <>
      <h1>Member Area</h1>

      {payment === "cancelled" && (
        <div className="notice warn">Payment not completed. You can try again.</div>
      )}

      <div className="card">
        <p>
          Hi, <strong>{user.email}</strong>
        </p>
        <p>
          Current plan: <strong>{isPaid ? PLAN.name : "Free Membership"}</strong>
        </p>
      </div>

      {isPaid ? (
        <div className="card">
          <h2>Premium content</h2>
          <p>Thanks for your support. You now have access to all premium content.</p>
        </div>
      ) : (
        <div className="card">
          <h2>Upgrade to {PLAN.name}</h2>
          <p>One-time payment of NT${PLAN.amount}. Yours forever.</p>
          {/* No amount is sent from here; the server decides it */}
          <form action="/api/checkout" method="post">
            <button type="submit" className="button">
              Upgrade for NT${PLAN.amount}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
