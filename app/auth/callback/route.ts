import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// After the user clicks the sign-in link, Supabase redirects back here (the redirect URL)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/member";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.log("Sign-in link verification failed", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
