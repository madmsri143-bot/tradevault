import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message, imageUrl, plan } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    if (message.length < 150) {
      return NextResponse.json({ error: "Message must be at least 150 characters long" }, { status: 400 });
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER || "your-email@gmail.com",
        pass: process.env.SMTP_PASS || "your-app-password",
      },
    });

    const mailOptions = {
      from: `"${name}" <support-noreply@tradevault.com>`, // Use a structured sender line
      to: "madmsri143@gmail.com",
      replyTo: email,
      subject: `[TradeVault Support] ${subject} - ${plan.toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00FFB2; background-color: #11161D; padding: 15px; border-radius: 8px;">New Support Request</h2>
          <p><strong>Trader Name:</strong> ${name}</p>
          <p><strong>Email Address:</strong> ${email}</p>
          <p><strong>Current Plan:</strong> <span style="text-transform: uppercase;">${plan}</span></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #333;">${message}</div>
          ${imageUrl ? `<br/><p><strong>Attachment:</strong></p><img src="${imageUrl}" style="max-width: 100%; border-radius: 8px;" alt="Attached Image" />` : ""}
        </div>
      `,
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP credentials not found. Mocking successful email delivery. Body:", mailOptions);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Support API Error:", error);
    return NextResponse.json({ error: "Failed to process support request" }, { status: 500 });
  }
}
