# Demo Member Site

A demo site for deployment, sign-in, and payments.

- Signed-in users get access to the **Member Area** and can upgrade to **Premium Membership** for NT$99
- Hosting: Vercel
- Database and auth: Supabase (email sign-in link)
- Payments: ECPay sandbox. To switch providers, replace `lib/ecpay.ts`

## Pages

| Path | Description | Sign-in required |
|---|---|---|
| `/` | Home | No |
| `/pricing` | Pricing | No |
| `/terms` | Terms | No |
| `/login` | Sign in with an email link | No |
| `/member` | Member Area, with the upgrade button | Yes |
| `/orders` | My Orders | Yes |
| `/payment/result` | Payment result | Yes |

| API | Description |
|---|---|
| `POST /api/checkout` | Creates a pending order and redirects to the payment page |
| `POST /api/payment/notify` | Background notification from the payment provider. The only place orders are marked as paid |
| `POST /api/payment/return` | Where the browser returns after paying. Redirects to the result page without changing anything |
| `GET /api/cron/expire-orders` | Daily job that cancels orders pending for more than a day |

## How it works

**Secrets**
- Secret keys (`SUPABASE_SERVICE_ROLE_KEY`, ECPay HashKey / HashIV) are only used on the server. `lib/supabase/admin.ts` and `lib/ecpay.ts` import `server-only`, so the build fails if they are imported from client code
- Only public keys use the `NEXT_PUBLIC_` prefix
- All configuration comes from environment variables (see `.env.example`)

**Sign-in**
- Uses Supabase Auth; no passwords are stored
- Protected pages are checked twice: once in `proxy.ts`, and again on the server in each page and API route
- The sign-in link's redirect URL uses `window.location.origin` instead of a hard-coded host

**Payments** (`app/api/payment/notify/route.ts`)
1. Verify the source: recompute the CheckMacValue with our own keys
2. Compare the amount against our own order
3. Failed payments don't upgrade; the order stays pending
4. Duplicate notifications are processed once: already-paid orders are skipped, the update is conditional on `status = 'pending'`, and `membership_upgrades.order_id` is unique
5. Respond with `1|OK` to acknowledge receipt

## Setup

### 1. Supabase

1. Create a project
2. In the **SQL Editor**, run `supabase/schema.sql`
3. In **Authentication → URL Configuration**:
   - **Site URL**: your production URL, e.g. `https://xxx.vercel.app`
   - **Redirect URLs**: add `http://localhost:3000/**` and `https://xxx.vercel.app/**`
   - If you later switch to a custom domain, add it here too
4. Copy the Project URL (without `/rest/v1/`) from **Connect** or **Project Settings → Data API**, and the publishable (anon) key and secret (service_role) key from **Project Settings → API Keys**

Supabase's built-in email service only sends a few emails per hour. If you see "email rate limit exceeded", wait an hour or set up custom SMTP in **Authentication → Emails**.

### 2. Run locally

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev
```

Open http://localhost:3000.

Sign-in works locally, but payment notifications can't reach `localhost`. Deploy first to test payments end to end.

### 3. Deploy to Vercel

1. Import this repository into Vercel
2. Add every variable from `.env.example` under **Environment Variables**
   - `SITE_URL`: the production URL Vercel gives you
   - `CRON_SECRET`: a long random string
3. Deploy
4. Make sure the production URL is listed in Supabase's URL Configuration

After changing environment variables, redeploy for them to take effect.

### 4. ECPay sandbox

`.env.example` contains the public sandbox merchant from ECPay's official documentation (MerchantID `3002607`).

- See the [ECPay developer docs](https://developers.ecpay.com.tw/) for the latest sandbox test card numbers
- Before going live, use your own merchant ID, HashKey, and HashIV, and point `ECPAY_PAYMENT_URL` to the production endpoint

## Replaying a payment notification

Resend the first notification received for an order, exactly as it was:

```bash
npm run replay-notify -- <order number>                         # sends to SITE_URL in .env.local
npm run replay-notify -- <order number> https://xxx.vercel.app  # sends to a specific URL
```

The order is not processed twice: the logs show `Order already paid, skipping`, and `membership_upgrades` still has a single row for the order.

## CheckMacValue

The CheckMacValue implementation in `lib/ecpay.ts` has been verified against the example in ECPay's official documentation.
