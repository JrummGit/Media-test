import "server-only";
import { formatPrice } from "@/lib/types";

/** Sends through Resend's HTTP API when RESEND_API_KEY is set; otherwise logs and skips. */
async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email skipped: RESEND_API_KEY not set] to=${to} subject="${subject}"`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Press Play Media <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) console.error(`[email failed] ${res.status} ${await res.text()}`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface OrderEmail {
  email: string | null;
  name: string | null;
  lines: { title: string; amountCents: number }[];
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export async function sendOrderEmails(order: OrderEmail) {
  const rows = order.lines
    .map((l) => `<tr><td>${esc(l.title)}</td><td align="right">${formatPrice(l.amountCents)}</td></tr>`)
    .join("");
  const table = `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif">${rows}
    <tr><td>Shipping</td><td align="right">${formatPrice(order.shippingCents)}</td></tr>
    ${order.taxCents ? `<tr><td>Tax</td><td align="right">${formatPrice(order.taxCents)}</td></tr>` : ""}
    <tr><td><b>Total</b></td><td align="right"><b>${formatPrice(order.totalCents)}</b></td></tr></table>`;

  const jobs: Promise<void>[] = [];
  if (order.email) {
    jobs.push(
      send(
        order.email,
        "Your Press Play Media order",
        `<p>Thanks${order.name ? `, ${esc(order.name.split(" ")[0])}` : ""}! Your order is in and will be packed with care.</p>${table}<p>We'll email you a tracking number when it ships.</p><p>Be kind, rewind.</p>`,
      ),
    );
  }
  if (process.env.OWNER_EMAIL) {
    jobs.push(send(process.env.OWNER_EMAIL, `New order: ${formatPrice(order.totalCents)}`, `<p>New order from ${esc(order.email ?? "unknown")}.</p>${table}`));
  }
  await Promise.all(jobs);
}

export async function sendShippedEmail(email: string, trackingNumber: string | null) {
  const track = trackingNumber
    ? `<p>Tracking number: <b>${esc(trackingNumber)}</b><br><a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}">Track it with USPS</a></p>`
    : "";
  await send(email, "Your Press Play Media order has shipped", `<p>Good news: your order is on its way.</p>${track}<p>Be kind, rewind.</p>`);
}
