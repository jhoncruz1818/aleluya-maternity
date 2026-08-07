import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
    this.from =
      config.get<string>('MAIL_FROM')?.trim() ||
      'Aleluya Maternity <onboarding@resend.dev>';
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY vacío — los emails de la app no se enviarán',
      );
    }
  }

  isConfigured() {
    return Boolean(this.resend);
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    await this.send({
      to,
      subject: 'Recupera tu contraseña — Aleluya Maternity',
      html: `
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Aleluya Maternity.</p>
        <p><a href="${resetUrl}">Haz clic aquí para elegir una contraseña nueva</a></p>
        <p>Este enlace caduca en 1 hora. Si no pediste el cambio, ignora este correo.</p>
        <p style="color:#666;font-size:12px;">Si el enlace no funciona, copia y pega esta URL:<br/>${resetUrl}</p>
      `,
      text: `Recupera tu contraseña en Aleluya Maternity.\n\nAbre este enlace (válido 1 hora):\n${resetUrl}\n\nSi no pediste el cambio, ignora este correo.`,
    });
  }

  async sendEmailVerification(to: string, verifyUrl: string) {
    await this.send({
      to,
      subject: 'Confirma tu email — Aleluya Maternity',
      html: `
        <p>Hola,</p>
        <p>Gracias por registrarte en Aleluya Maternity. Confirma tu correo para activar la cuenta.</p>
        <p><a href="${verifyUrl}">Confirmar mi email</a></p>
        <p>Este enlace caduca en 24 horas.</p>
        <p style="color:#666;font-size:12px;">Si el enlace no funciona, copia y pega esta URL:<br/>${verifyUrl}</p>
      `,
      text: `Confirma tu email en Aleluya Maternity.\n\nAbre este enlace (válido 24 horas):\n${verifyUrl}`,
    });
  }

  private async send(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    if (!this.resend) {
      this.logger.error(`No se puede enviar a ${opts.to}: falta RESEND_API_KEY`);
      throw new Error('Email no configurado');
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (error) {
      this.logger.error(`Resend error: ${JSON.stringify(error)}`);
      throw new Error(error.message || 'No se pudo enviar el email');
    }
  }
}
