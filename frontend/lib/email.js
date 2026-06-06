import nodemailer from "nodemailer"

// Gmail transport. Requires a Gmail *App Password* (not the normal password):
//   GMAIL_USER          e.g. rotaractaiht@gmail.com
//   GMAIL_APP_PASSWORD  16-char app password from https://myaccount.google.com/apppasswords
// If GMAIL_APP_PASSWORD is missing, sending is skipped gracefully (no crash) so
// approvals still succeed and the admin can relay credentials manually.

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null
  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
  return _transporter
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rc-aiht-1xrs.vercel.app"
const FROM_NAME = "Rotaract Club of AIHT"

function shell(title, bodyHtml) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="background:#0066cc;color:#fff;padding:20px 24px">
      <h2 style="margin:0;font-size:18px">${title}</h2>
      <p style="margin:4px 0 0;font-size:12px;opacity:.85">Rotaract Club of AIHT</p>
    </div>
    <div style="padding:24px;color:#222;font-size:14px;line-height:1.6">${bodyHtml}</div>
    <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px">
      This is an automated message from the Rotaract Club of AIHT portal.
    </div>
  </div>`
}

// Returns { sent: boolean, error?: string }
export async function sendApprovalEmail({ to, name, loginEmail, password, memberId }) {
  const t = getTransporter()
  if (!t) return { sent: false, error: "Email not configured (GMAIL_APP_PASSWORD missing)" }

  const html = shell(
    "Your membership is approved 🎉",
    `<p>Hi ${name || "there"},</p>
     <p>Your registration with the <b>Rotaract Club of AIHT</b> has been approved.
        You can now log in to the member portal using the credentials below.</p>
     <table style="margin:16px 0;border-collapse:collapse">
       <tr><td style="padding:6px 12px;color:#666">Email</td><td style="padding:6px 12px"><b>${loginEmail}</b></td></tr>
       <tr><td style="padding:6px 12px;color:#666">Password</td><td style="padding:6px 12px"><b>${password}</b></td></tr>
       <tr><td style="padding:6px 12px;color:#666">Member ID</td><td style="padding:6px 12px"><b>${memberId}</b></td></tr>
     </table>
     <p><a href="${SITE_URL}/login" style="display:inline-block;background:#0066cc;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">Log in now</a></p>
     <p style="color:#a00;font-size:13px">For your security, please change this password after your first login (Profile &rarr; Change Password).</p>`
  )

  try {
    await t.sendMail({
      from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: "Welcome to Rotaract Club of AIHT — Your login details",
      html,
    })
    return { sent: true }
  } catch (e) {
    return { sent: false, error: e.message }
  }
}

// Returns { sent: boolean, error?: string }
export async function sendRejectionEmail({ to, name, reason }) {
  const t = getTransporter()
  if (!t) return { sent: false, error: "Email not configured" }

  const html = shell(
    "Update on your registration",
    `<p>Hi ${name || "there"},</p>
     <p>Thank you for your interest in the <b>Rotaract Club of AIHT</b>.
        After review, we are unable to approve your registration at this time.</p>
     ${reason ? `<p style="background:#fff6f6;border-left:3px solid #d33;padding:10px 14px;color:#900">${reason}</p>` : ""}
     <p>If you believe this was a mistake, please reach out to the club.</p>`
  )

  try {
    await t.sendMail({
      from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: "Rotaract Club of AIHT — Registration update",
      html,
    })
    return { sent: true }
  } catch (e) {
    return { sent: false, error: e.message }
  }
}
