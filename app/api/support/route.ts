import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message, plan } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    if (message.length < 150) {
      return NextResponse.json({ error: "Message must be at least 150 characters long" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"${name}" <${process.env.GMAIL_USER}>`,
      to: "madmsri143@gmail.com",
      replyTo: email,
      subject: `[TradeVault Support] ${subject} - ${plan?.toUpperCase() || "UNKNOWN"}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00FFB2; background-color: #11161D; padding: 15px; border-radius: 8px;">New Support Request</h2>
          <p><strong>Trader Name:</strong> ${name}</p>
          <p><strong>Email Address:</strong> ${email}</p>
          <p><strong>Current Plan:</strong> <span style="text-transform: uppercase;">${plan || "UNKNOWN"}</span></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #333;">${message}</div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Support email delivered successfully");

    return NextResponse.json({ success: true, message: "Message sent successfully" });
  } catch (error: any) {
    console.error("Support API Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
