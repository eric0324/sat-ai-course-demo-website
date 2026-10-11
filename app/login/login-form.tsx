"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Only allow same-site paths, so this can't be abused to redirect to other sites
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/member";
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    // The email contains a sign-in link that sends the user back to this redirect URL.
    // Using window.location.origin works both locally and in production (never hard-code localhost).
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
    setStep("sent");
    setMessage("Check your email and click the sign-in link.");
  }

  return (
    <div className="card">
      {message && <div className="notice">{message}</div>}

      {step === "email" ? (
        <form onSubmit={sendLink}>
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
            {loading ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setStep("email");
            setMessage(null);
          }}
        >
          Use a different email
        </button>
      )}
    </div>
  );
}
