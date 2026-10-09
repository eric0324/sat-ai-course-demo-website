import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demo Member Site",
  description: "Demo site for the going-live course",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <header className="header">
          <Link href="/" className="brand">
            Demo Member Site
          </Link>
          <nav>
            <Link href="/pricing">Pricing</Link>
            {user ? (
              <>
                <Link href="/member">Member Area</Link>
                <Link href="/orders">My Orders</Link>
                <span className="muted">{user.email}</span>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="link-button">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
