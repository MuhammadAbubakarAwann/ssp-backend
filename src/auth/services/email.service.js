import nodemailer from "nodemailer"
import { config } from "../../../config/env.js" 

class EmailService {
  constructor() {
    if (!config.email.host || !config.email.port || !config.email.user || !config.email.pass) {
      console.warn("Email service not fully configured. Skipping email sending.")
      this.transporter = null
    } else {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      })
    }
  }

  async sendEmail(to, subject, htmlContent, textContent) {
    if (!this.transporter) {
      console.warn(`Email not sent to ${to}: Email service not configured.`)
      return
    }

    const mailOptions = {
      from: config.email.from,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    }

    try {
      const info = await this.transporter.sendMail(mailOptions)
      console.log("Message sent: %s", info.messageId)
      return info
    } catch (error) {
      console.error("Error sending email:", error)
      throw new Error("Failed to send email")
    }
  }

  // Updated to send a 4-digit code
  async sendVerificationCode(to, code) {
    const subject = "Your Doomli Email Verification Code"
    const htmlContent = `
      <p>Hello,</p>
      <p>Thank you for registering with Doomli! Your 4-digit verification code is:</p>
      <h2 style="color: #007bff; font-size: 24px; text-align: center;">${code}</h2>
      <p>This code is valid for 10 minutes. Please enter it in the app to verify your email address.</p>
      <p>If you did not register for a Doomli account, please ignore this email.</p>
      <p>Regards,<br/>The Doomli Team</p>
    `
    const textContent = `Hello,\nThank you for registering with Doomli! Your 4-digit verification code is: ${code}\nThis code is valid for 10 minutes. Please enter it in the app to verify your email address.\nIf you did not register for a Doomli account, please ignore this email.\nRegards,\nThe Doomli Team`

    await this.sendEmail(to, subject, htmlContent, textContent)
  }

  // Send password setup OTP for Google users
  async sendPasswordSetupOTP(to, code) {
    const subject = "Set Up Your Doomli Password"
    const htmlContent = `
      <p>Hello,</p>
      <p>You requested to set up a password for your Doomli account. Your 4-digit verification code is:</p>
      <h2 style="color: #007bff; font-size: 24px; text-align: center;">${code}</h2>
      <p>This code is valid for 10 minutes. Please enter it in the app to verify and set your new password.</p>
      <p>This will allow you to login with both Google and email/password authentication.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Regards,<br/>The Doomli Team</p>
    `
    const textContent = `Hello,\nYou requested to set up a password for your Doomli account. Your 4-digit verification code is: ${code}\nThis code is valid for 10 minutes. Please enter it in the app to verify and set your new password.\nThis will allow you to login with both Google and email/password authentication.\nIf you did not request this, please ignore this email.\nRegards,\nThe Doomli Team`

    await this.sendEmail(to, subject, htmlContent, textContent)
  }

  async sendPasswordResetEmail(to, token) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}` // Adjust this URL for your Flutter app
    const subject = "Reset Your Doomli Password"
    const htmlContent = `
      <p>Hello,</p>
      <p>You have requested to reset your password for your Doomli account. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
      <p>Regards,<br/>The Doomli Team</p>
    `
    const textContent = `Hello,\nYou have requested to reset your password for your Doomli account. Visit this link to reset it: ${resetUrl}\nThis link will expire in 1 hour. If you did not request a password reset, please ignore this email.\nRegards,\nThe Doomli Team`

    await this.sendEmail(to, subject, htmlContent, textContent)
  }
}

export const emailService = new EmailService()
