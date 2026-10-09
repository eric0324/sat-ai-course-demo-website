// The public site URL. Payment notifications are sent here,
// so SITE_URL must be set in production.
export function getSiteUrl(request: Request) {
  const fromEnv = process.env.SITE_URL?.replace(/\/$/, "");
  return fromEnv || new URL(request.url).origin;
}
