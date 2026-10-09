import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed "middleware" to "proxy".

// Pages that require sign-in
const PROTECTED_PATHS = ["/member", "/orders", "/payment/result"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session and find out who the user is
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const needsLogin = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Not signed in: send to the login page, then back to where they wanted to go
  if (needsLogin && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Payment notifications and cron jobs skip the sign-in check; they verify themselves.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/payment|api/cron).*)"],
};
