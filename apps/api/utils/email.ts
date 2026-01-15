/**
 * Normalized email payload structure.
 * All email webhooks are converted to this format regardless of provider.
 */
export interface NormalizedEmailPayload {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}

/**
 * Normalize email payload from various provider formats into a predictable shape.
 * Handles common variations in field names across different email providers.
 *
 * @param payload - Raw email webhook payload from any provider
 * @returns Normalized email payload with from, to, cc, bcc, subject, body fields
 */
export function normalizeEmailPayload(
  payload: unknown,
): NormalizedEmailPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid email payload: must be an object');
  }

  const obj = payload as Record<string, unknown>;

  // Extract 'from' field (common variations: from, sender, from_email, fromEmail, From)
  const from =
    (obj.from as string) ||
    (obj.sender as string) ||
    (obj.from_email as string) ||
    (obj.fromEmail as string) ||
    (obj.From as string) ||
    '';

  // Extract 'to' field (common variations: to, to_email, toEmail, To, recipient, recipients)
  // Handle both string and array formats
  const toRaw =
    obj.to ||
    obj.to_email ||
    obj.toEmail ||
    obj.To ||
    obj.recipient ||
    obj.recipients ||
    '';
  const to = Array.isArray(toRaw)
    ? (toRaw as string[]).map((addr) => String(addr).trim().toLowerCase())
    : String(toRaw)
        .split(',')
        .map((addr) => addr.trim().toLowerCase())
        .filter((addr) => addr.length > 0);

  // Extract 'cc' field (optional, common variations: cc, cc_email, ccEmail, Cc)
  const ccRaw = obj.cc || obj.cc_email || obj.ccEmail || obj.Cc;
  const cc = ccRaw
    ? Array.isArray(ccRaw)
      ? (ccRaw as string[]).map((addr) => String(addr).trim().toLowerCase())
      : String(ccRaw)
          .split(',')
          .map((addr) => addr.trim().toLowerCase())
          .filter((addr) => addr.length > 0)
    : undefined;

  // Extract 'bcc' field (optional, common variations: bcc, bcc_email, bccEmail, Bcc)
  const bccRaw = obj.bcc || obj.bcc_email || obj.bccEmail || obj.Bcc;
  const bcc = bccRaw
    ? Array.isArray(bccRaw)
      ? (bccRaw as string[]).map((addr) => String(addr).trim().toLowerCase())
      : String(bccRaw)
          .split(',')
          .map((addr) => addr.trim().toLowerCase())
          .filter((addr) => addr.length > 0)
    : undefined;

  // Extract 'subject' field (common variations: subject, Subject, subject_line, subjectLine)
  const subject =
    (obj.subject as string) ||
    (obj.Subject as string) ||
    (obj.subject_line as string) ||
    (obj.subjectLine as string) ||
    '';

  // Extract 'body' field (common variations: body, text, body_plain, bodyPlain, content, message, html, text_body)
  // Prefer plain text over HTML
  const body =
    (obj.body as string) ||
    (obj.text as string) ||
    (obj.body_plain as string) ||
    (obj.bodyPlain as string) ||
    (obj.text_body as string) ||
    (obj.textBody as string) ||
    (obj.content as string) ||
    (obj.message as string) ||
    (obj.html as string) || // Fallback to HTML if no plain text available
    '';

  return {
    from: from.trim(),
    to,
    ...(cc && cc.length > 0 ? { cc } : {}),
    ...(bcc && bcc.length > 0 ? { bcc } : {}),
    subject: subject.trim(),
    body: body.trim(),
  };
}
