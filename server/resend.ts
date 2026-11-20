export interface InviteEmailTemplateParams {
  orgName: string;
  orgSlug: string;
  recipientName: string;
  recipientEmail: string;
  inviterName: string;
  role: string;
  department: string;
  acceptUrl: string;
  personalNote?: string;
}

export function buildResendInviteEmailHtml(params: InviteEmailTemplateParams): string {
  const safeNote = params.personalNote
    ? `<p style="margin:16px 0 0;padding:12px 14px;border:1px solid #e4e4e7;border-radius:8px;background:#fafafa;color:#27272a;font-size:13px;line-height:1.5;">"${escapeHtml(params.personalNote)}" — ${escapeHtml(params.inviterName)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#09090b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d4d4d8;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="height:4px;background:linear-gradient(90deg,#fde047,#facc15,#f59e0b);"></td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          <div style="font-size:16px;font-weight:700;letter-spacing:-0.02em;color:#09090b;">Ravfina</div>
          <h1 style="margin:18px 0 8px;font-size:22px;line-height:1.25;color:#09090b;">
            You're invited to ${escapeHtml(params.orgName)}
          </h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#52525b;">
            ${escapeHtml(params.inviterName)} invited ${escapeHtml(params.recipientName)} (${escapeHtml(params.recipientEmail)}) to join the
            <strong>${escapeHtml(params.orgName)}</strong> treasury workspace on Ravfina.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid #e4e4e7;border-radius:8px;background:#fafafa;">
            <tr>
              <td style="padding:12px 16px;font-size:12px;color:#52525b;">Assigned Role</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#09090b;text-align:right;text-transform:capitalize;">${escapeHtml(params.role)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:12px;color:#52525b;">Department</td>
              <td style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:13px;font-weight:600;color:#09090b;text-align:right;">${escapeHtml(params.department)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:12px;color:#52525b;">Workspace Route</td>
              <td style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:12px;font-family:monospace;color:#854d0e;text-align:right;">/app/${escapeHtml(params.orgSlug)}</td>
            </tr>
          </table>
          ${safeNote}
          <div style="margin:24px 0 12px;">
            <a href="${escapeHtml(params.acceptUrl)}" style="display:inline-block;padding:12px 22px;background:#facc15;color:#000000;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              Accept Workspace Invitation
            </a>
          </div>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
            Hardware WebAuthn or SSO verification is required upon first sign-in. This invitation expires in 7 days.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function dispatchResendInviteEmail(params: InviteEmailTemplateParams): Promise<{
  htmlPreview: string;
  deliveryStatus: 'Delivered via Resend' | 'Preview Queued (Resend Key Optional)' | 'Failed';
  emailId: string | null;
  errorMessage?: string;
}> {
  const htmlPreview = buildResendInviteEmailHtml(params);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'Ravfina Treasury <onboarding@resend.dev>';

  if (!apiKey) {
    return {
      htmlPreview,
      deliveryStatus: 'Preview Queued (Resend Key Optional)',
      emailId: null,
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.recipientEmail],
        subject: `${params.inviterName} invited you to ${params.orgName} on Ravfina`,
        html: htmlPreview,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        htmlPreview,
        deliveryStatus: 'Failed',
        emailId: null,
        errorMessage: `Resend API ${response.status}: ${errText}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return {
      htmlPreview,
      deliveryStatus: 'Delivered via Resend',
      emailId: data.id ?? null,
    };
  } catch (err) {
    return {
      htmlPreview,
      deliveryStatus: 'Failed',
      emailId: null,
      errorMessage: err instanceof Error ? err.message : 'Resend dispatch error',
    };
  }
}
