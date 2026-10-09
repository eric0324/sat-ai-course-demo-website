import Link from "next/link";
import { PLAN } from "@/lib/plan";

// Public page: no sign-in required
export default function HomePage() {
  return (
    <>
      <h1>Welcome to the Demo Member Site</h1>
      <div className="card">
        <p>A demo site for deployment, sign-in, and payments.</p>
        <p>
          Sign in to access the Member Area, and upgrade to {PLAN.name} for NT${PLAN.amount}.
        </p>
        <p>
          <Link href="/member" className="button">
            Go to Member Area
          </Link>
        </p>
      </div>
      <p className="muted">
        <Link href="/pricing">Pricing</Link> · <Link href="/terms">Terms</Link>
      </p>
    </>
  );
}
