// Sending email (sign-up confirmation, password reset). A small interface so any transport can be used.
// With no transport configured, nothing is sent, email confirmation is not required, and "forgot password"
// is hidden, because promising an email that never arrives is worse than not offering it.

type Env = Record<string, string | undefined>

export interface Mail { to: string, subject: string, text: string }
export interface Mailer { send(mail: Mail): Promise<void> }

/** SMTP through nodemailer. OPENLOBS_SMTP_URL looks like smtps://user:pass@smtp.example.com:465. */
export async function createMailer(env: Env = process.env): Promise<Mailer | undefined> {
  const url = env.OPENLOBS_SMTP_URL?.trim()
  const from = env.OPENLOBS_MAIL_FROM?.trim()
  if (!url || !from) return undefined
  const nodemailer = await import('nodemailer')
  const transport = nodemailer.createTransport(url)
  return { send: async ({ to, subject, text }) => { await transport.sendMail({ from, to, subject, text }) } }
}
