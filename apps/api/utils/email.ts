/**
 * Normalized email payload structure.
 * All email webhooks are converted to this format regardless of provider.
 */
export interface NormalizedEmailPayload {
  from: string;
  subject: string;
  body: string;
}

/**
 * Normalize email payload from various provider formats into a predictable shape.
 * Handles common variations in field names across different email providers.
 *
 * @param payload - Raw email webhook payload from any provider
 * @returns Normalized email payload with from, subject, body fields
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
    subject: subject.trim(),
    body: body.trim(),
  };
}
