import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      'Travelyx <noreply@travelyx.com.br>';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP not configured (missing SMTP_HOST, SMTP_USER, or SMTP_PASS). Email sending is disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.logger.log(`Email transport configured via ${host}:${port}`);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async sendInviteEmail(
    to: string,
    inviterName: string,
    tripName: string,
    tripDestination: string,
    role: string,
    acceptUrl: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Skipping invite email to ${to} — SMTP not configured.`,
      );
      return;
    }

    const roleLabel = role === 'EDITOR' ? 'Editor' : 'Visualizador';

    const subject = `${inviterName} te convidou para planejar uma viagem!`;

    const html = this.buildInviteHtml(
      inviterName,
      tripName,
      tripDestination,
      roleLabel,
      acceptUrl,
    );

    const text = this.buildInvitePlainText(
      inviterName,
      tripName,
      tripDestination,
      roleLabel,
      acceptUrl,
    );

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text,
      });
      this.logger.log(`Invite email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${to}`, error);
    }
  }

  async sendPriceAlertEmail(
    to: string,
    typeLabel: string,
    label: string,
    oldPrice: number,
    newPrice: number,
    dropPercent: number,
    currency: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Skipping price alert email to ${to} — SMTP not configured.`);
      return;
    }

    const subject = `🎉 ${typeLabel} mais barato! ${label}`;
    const savings = (oldPrice - newPrice).toFixed(2);

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f3f8;font-family:'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f8;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;">🎉 Preço caiu!</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="font-size:16px;color:#2d3436;line-height:1.6;">
<strong>${label}</strong> está mais barato!
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-radius:12px;padding:20px;">
<tr>
<td style="text-align:center;padding:12px;">
<p style="margin:0;font-size:13px;color:#999;">Preço anterior</p>
<p style="margin:4px 0 0;font-size:20px;color:#999;text-decoration:line-through;">R$ ${oldPrice.toFixed(2)}</p>
</td>
<td style="text-align:center;padding:12px;">
<p style="margin:0;font-size:13px;color:#16a34a;">Novo preço</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#16a34a;">R$ ${newPrice.toFixed(2)}</p>
</td>
</tr>
</table>
<p style="text-align:center;font-size:14px;color:#f97316;font-weight:600;">
Economia de R$ ${savings} (${dropPercent}% de desconto)
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
<tr><td align="center">
<a href="https://travelyx.com.br/alertas" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:12px;">
Ver meus alertas →
</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 40px 24px;text-align:center;">
<p style="font-size:12px;color:#b2bec3;">Travelyx — Planeje viagens com inteligência</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

    const text = `${label} caiu de R$${oldPrice.toFixed(2)} para R$${newPrice.toFixed(2)} (${dropPercent}% de desconto). Ver: https://travelyx.com.br/alertas`;

    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject, html, text });
      this.logger.log(`Price alert email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send price alert email to ${to}`, error);
    }
  }

  // ─── HTML Builder ────────────────────────────────────────────────────────────

  private buildInviteHtml(
    inviterName: string,
    tripName: string,
    tripDestination: string,
    roleLabel: string,
    acceptUrl: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite Travelyx</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f3f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(108,92,231,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6C5CE7 0%,#a29bfe 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                ✈ Travelyx
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:400;">
                Planeje viagens com inteligência
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 16px;">
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#2d3436;">
                Olá! 👋
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#2d3436;">
                <strong style="color:#6C5CE7;">${inviterName}</strong> está te convidando para planejar a viagem
                <strong>"${tripName}"</strong> para
                <strong>${tripDestination}</strong>.
              </p>

              <!-- Role Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#f4f3f8;border-radius:8px;padding:12px 20px;">
                    <span style="font-size:13px;color:#636e72;">Você será:</span>
                    <span style="font-size:14px;font-weight:600;color:#6C5CE7;margin-left:6px;">${roleLabel}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <a href="${acceptUrl}" target="_blank"
                       style="display:inline-block;background:linear-gradient(135deg,#6C5CE7 0%,#a29bfe 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 48px;border-radius:12px;letter-spacing:0.3px;">
                      Aceitar convite
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <p style="margin:0 0 8px;font-size:13px;color:#b2bec3;text-align:center;">
                ⏳ O convite expira em 7 dias.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #f0eef5;margin:16px 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#b2bec3;">
                Travelyx — Planeje viagens com inteligência
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#dfe6e9;">
                Se você não esperava este email, pode ignorá-lo com segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ─── Plain Text Builder ──────────────────────────────────────────────────────

  private buildInvitePlainText(
    inviterName: string,
    tripName: string,
    tripDestination: string,
    roleLabel: string,
    acceptUrl: string,
  ): string {
    return [
      `Travelyx — Planeje viagens com inteligência`,
      ``,
      `Olá!`,
      ``,
      `${inviterName} está te convidando para planejar a viagem "${tripName}" para ${tripDestination}.`,
      ``,
      `Você será: ${roleLabel}`,
      ``,
      `Aceitar convite: ${acceptUrl}`,
      ``,
      `O convite expira em 7 dias.`,
      ``,
      `---`,
      `Se você não esperava este email, pode ignorá-lo com segurança.`,
    ].join('\n');
  }
}
