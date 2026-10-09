"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Only allow same-site paths, so this can't be abused to redirect to other sites
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/member";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    // The email contains both a 6-digit code and a sign-in link.
    // The link sends the user back to this redirect URL. Using window.location.origin
    // works both locally and in production (never hard-code localhost).
    // This URL must also be listed in Supabase's Redirect URLs, or it will be rejected.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setLoading(false);
    if (error) {
      setMessage(`Couldn't send the email: ${error.message}`);
      return;
    }
    setStep("code");
    setMessage("Check your email. Enter the 6-digit code, or click the sign-in link in the email.");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

    setLoading(false);
    if (error) {
      setMessage(`Verification failed: ${error.message}`);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="card">
      {message && <div className="notice">{message}</div>}

      {step === "email" ? (
        <form onSubmit={sendCode}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <label htmlFor="code">Code</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            placeholder="6-digit code"
          />
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Verifying…" : "Sign in"}
          </button>{" "}
          <button type="button" className="link-button" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
