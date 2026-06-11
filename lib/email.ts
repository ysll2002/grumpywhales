import { Resend } from 'resend';

let _client: Resend | undefined;
function client(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    _client = new Resend(key);
  }
  return _client;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@grumpywhales.com';

export async function sendEmail(opts: {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
  replyTo?: string;
}): Promise<{ id: string | null }> {
  const { data, error } = await client().emails.send({
    from:    `GrumpyWhales <${FROM}>`,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text,
    replyTo: opts.replyTo,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { id: data?.id ?? null };
}
