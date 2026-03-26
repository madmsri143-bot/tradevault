import nodemailer from 'nodemailer';

// Configure SMTP using Brevo
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_USER || "Madmsri143@gmail.com",
    pass: process.env.BREVO_SMTP_KEY,
  },
});

/**
 * Reusable function to send an email using Brevo SMTP
 */
export async function sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
  try {
    // Use the verified Brevo email as the sender to avoid sender rejection errors
    const sender = `"Trade Journal" <madmsri143@gmail.com>`;

    await transporter.sendMail({
      from: sender,
      to,
      subject,
      html: htmlContent,
    });

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// ============================================================================
// Testing Section
// ============================================================================

async function runTest() {
  // 👉 Sending to your own email address
  const testRecipient = 'madmsri143@gmail.com';

  console.log(`Starting test: Sending email to ${testRecipient}...`);

  const dynamicSubject = 'Trade Journal - Brevo SMTP Test';

  // Styled HTML body
  const styledHtmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #09090b; color: #fafafa; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #27272a;">
      <h2 style="color: #10b981; margin-top: 0;">Brevo SMTP Setup Successful!</h2>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
        Hello! This is a test email sent from your Trade Journal application using <strong>TypeScript</strong>, <strong>Nodemailer</strong>, and <strong>Brevo SMTP</strong>.
      </p>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
        If you are receiving this, your connection is working perfectly.
      </p>
      <div style="margin-top: 35px; text-align: center;">
        <a href="#" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;" />
      <p style="font-size: 12px; color: #71717a; text-align: center;">
        The Trade Journal Team
      </p>
    </div>
  `;

  await sendEmail(testRecipient, dynamicSubject, styledHtmlBody);
}

// Execute the test function
runTest();
