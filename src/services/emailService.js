const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    if (!this.isConfigured()) {
      logger.warn('Configurações de email não encontradas. Emails serão apenas logados.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verificar conexão
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Erro na configuração do email:', error);
        } else {
          logger.info('Servidor de email configurado e pronto');
        }
      });
    } catch (error) {
      logger.error('Erro ao configurar transporter de email:', error);
    }
  }

  isConfigured() {
    return !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!this.transporter) {
        logger.info(`[EMAIL SIMULADO] Para: ${to}, Assunto: ${subject}`);
        if (text) logger.info(`Conteúdo: ${text}`);
        return { messageId: 'simulated' };
      }

      const mailOptions = {
        from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email enviado para ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email, name) {
    const subject = `Bem-vindo ao ${config.FROM_NAME}!`;
    const html = this.getWelcomeTemplate(name);
    const text = `Olá ${name}! Bem-vindo ao ${config.FROM_NAME}. Sua conta foi criada com sucesso.`;

    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendEmailVerification(email, name, token) {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email/${token}`;
    const subject = 'Confirme seu email';
    const html = this.getEmailVerificationTemplate(name, verificationUrl);
    const text = `Olá ${name}! Clique no link para verificar seu email: ${verificationUrl}`;

    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendPasswordReset(email, name, token) {
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;
    const subject = 'Recuperação de senha';
    const html = this.getPasswordResetTemplate(name, resetUrl);
    const text = `Olá ${name}! Clique no link para redefinir sua senha: ${resetUrl}`;

    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendPasswordChanged(email, name) {
    const subject = 'Senha alterada com sucesso';
    const html = this.getPasswordChangedTemplate(name);
    const text = `Olá ${name}! Sua senha foi alterada com sucesso.`;

    return await this.sendEmail({ to: email, subject, html, text });
  }

  getWelcomeTemplate(name) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo ao ${config.FROM_NAME}!</h1>
          </div>
          <div class="content">
            <h2>Olá ${name}!</h2>
            <p>Sua conta foi criada com sucesso. Agora você pode aproveitar todos os recursos da nossa plataforma.</p>
            <p>Se você tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${config.FROM_NAME}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getEmailVerificationTemplate(name, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirme seu email</h1>
          </div>
          <div class="content">
            <h2>Olá ${name}!</h2>
            <p>Por favor, clique no botão abaixo para confirmar seu endereço de email:</p>
            <a href="${verificationUrl}" class="button">Confirmar Email</a>
            <p>Este link é válido por 24 horas. Se você não solicitou esta verificação, ignore este email.</p>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all;">${verificationUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${config.FROM_NAME}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(name, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperação de Senha</h1>
          </div>
          <div class="content">
            <h2>Olá ${name}!</h2>
            <p>Você solicitou a recuperação da sua senha. Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
            <p>Este link é válido por apenas 10 minutos por motivos de segurança.</p>
            <p>Se você não solicitou esta recuperação, ignore este email. Sua senha permanecerá inalterada.</p>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${config.FROM_NAME}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordChangedTemplate(name) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Senha Alterada</h1>
          </div>
          <div class="content">
            <h2>Olá ${name}!</h2>
            <p>Sua senha foi alterada com sucesso em ${new Date().toLocaleString('pt-BR')}.</p>
            <p>Se você não fez esta alteração, entre em contato conosco imediatamente.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${config.FROM_NAME}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Exportar instância única
module.exports = new EmailService();