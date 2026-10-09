import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// ECPay all-in-one (AIO) checkout. To switch payment providers, this is the main file to replace.

function config() {
  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;
  const paymentUrl = process.env.ECPAY_PAYMENT_URL;
  if (!merchantId || !hashKey || !hashIv || !paymentUrl) {
    throw new Error("Missing ECPay env vars: ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV, ECPAY_PAYMENT_URL");
  }
  return { merchantId, hashKey, hashIv, paymentUrl };
}

// URL encoding required by ECPay (same as .NET HttpUtility.UrlEncode)
function ecpayUrlEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/~/g, "%7e")
    .replace(/'/g, "%27")
    .toLowerCase()
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
}

// CheckMacValue: sort params by name → wrap with HashKey / HashIV → URL-encode → SHA256 → uppercase
export function computeCheckMacValue(params: Record<string, string>) {
  const { hashKey, hashIv } = config();
  const query = Object.keys(params)
    .filter((key) => key !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIv}`;
  return createHash("sha256").update(ecpayUrlEncode(raw)).digest("hex").toUpperCase();
}

// Verify a notification really came from ECPay by recomputing the CheckMacValue with our own keys
export function verifyCheckMacValue(params: Record<string, string>) {
  const received = params.CheckMacValue ?? "";
  const expected = computeCheckMacValue(params);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// Order number: alphanumeric, max 20 characters, unique
export function generateTradeNo() {
  const time = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `DEMO${time}${random}`.slice(0, 20);
}

// Date format required by ECPay: yyyy/MM/dd HH:mm:ss (Taiwan time)
function taipeiNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}/${get("month")}/${get("day")} ${hour}:${get("minute")}:${get("second")}`;
}

// Build an auto-submitting form that sends the user to ECPay's payment page
export function buildCheckoutForm(options: {
  tradeNo: string;
  amount: number;
  itemName: string;
  siteUrl: string;
}) {
  const { merchantId, paymentUrl } = config();
  const params: Record<string, string> = {
    MerchantID: merchantId,
    MerchantTradeNo: options.tradeNo,
    MerchantTradeDate: taipeiNow(),
    PaymentType: "aio",
    TotalAmount: String(options.amount),
    TradeDesc: "Membership upgrade",
    ItemName: options.itemName,
    ChoosePayment: "Credit",
    EncryptType: "1",
    // Background notification: ECPay's server calls our backend directly. This is the source of truth.
    ReturnURL: `${options.siteUrl}/api/payment/notify`,
    // Where the user's browser returns after paying. Only used to show the result.
    OrderResultURL: `${options.siteUrl}/api/payment/return`,
    // Where the user goes if they click "back to store" on the payment page
    ClientBackURL: `${options.siteUrl}/member?payment=cancelled`,
  };
  params.CheckMacValue = computeCheckMacValue(params);

  const inputs = Object.entries(params)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}">`)
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Redirecting to payment</title></head>
<body>
<p>Redirecting to the payment page…</p>
<form id="checkout" method="post" action="${paymentUrl}">${inputs}</form>
<script>document.getElementById("checkout").submit();</script>
</body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
