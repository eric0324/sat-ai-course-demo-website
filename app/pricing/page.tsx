import Link from "next/link";
import { PLAN } from "@/lib/plan";

// Public page
export default function PricingPage() {
  return (
    <>
      <h1>Pricing</h1>
      <div className="card">
        <h2>Free Membership</h2>
        <p>Free. Sign in to access the Member Area.</p>
      </div>
      <div className="card">
        <h2>{PLAN.name}</h2>
        <p>One-time payment of NT${PLAN.amount}. Yours forever.</p>
        <Link href="/member" className="button">
          Upgrade
        </Link>
      </div>
    </>
  );
}
