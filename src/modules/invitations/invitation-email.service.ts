import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvitationEmailService {
  private readonly logger = new Logger(InvitationEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  buildAcceptanceUrl(token: string): string {
    const baseUrl = this.configService.get<string>(
      'INVITATION_ACCEPT_URL',
      'http://localhost:4000/api/v1/invitations/accept',
    );
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  async sendInvitation(input: {
    email: string;
    gymName: string;
    token: string;
    expiresAt: Date;
  }): Promise<{ acceptanceUrl: string; emailSent: boolean }> {
    const acceptanceUrl = this.buildAcceptanceUrl(input.token);
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('INVITATION_EMAIL_FROM');

    if (!apiKey || !from) {
      this.logger.warn(
        'Email de invitacion omitido: configura RESEND_API_KEY e INVITATION_EMAIL_FROM',
      );
      return { acceptanceUrl, emailSent: false };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [input.email],
          subject: `Invitacion para unirte a ${input.gymName}`,
          html: this.renderHtml(input, acceptanceUrl),
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        this.logger.error(
          `Resend rechazo la invitacion (${response.status}): ${details}`,
        );
        return { acceptanceUrl, emailSent: false };
      }

      return { acceptanceUrl, emailSent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo enviar la invitacion: ${message}`);
      return { acceptanceUrl, emailSent: false };
    }
  }

  private renderHtml(
    input: { gymName: string; expiresAt: Date },
    acceptanceUrl: string,
  ): string {
    const gymName = this.escapeHtml(input.gymName);
    const url = this.escapeHtml(acceptanceUrl);
    return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17202a">
        <h1 style="font-size:24px">Te invitaron a ${gymName}</h1>
        <p>Inicia sesion con este mismo email y acepta la invitacion.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#17202a;color:#fff;text-decoration:none;border-radius:6px">Aceptar invitacion</a></p>
        <p style="font-size:13px;color:#667085">El enlace vence el ${input.expiresAt.toISOString()}.</p>
      </div>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[character] ?? character,
    );
  }
}
