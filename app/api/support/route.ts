import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message, plan, attachmentUrl } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    if (message.length > 1000) {
      return NextResponse.json({ error: "Message must be under 1000 characters" }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER || "journalbudsupport@gmail.com";
    const gmailPass = process.env.GMAIL_APP_PASSWORD || "urlu lgbu kdsf awre";

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const mailOptions = {
      from: `"${name}" <${gmailUser}>`,
      to: "journalbudsupport@gmail.com",
      replyTo: email,
      subject: `[JournalBud Support] ${subject} - ${plan?.toUpperCase() || "UNKNOWN"}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D4AF37; background-color: #11161D; padding: 15px; border-radius: 8px;">New Support Request</h2>
          <p><strong>Trader Name:</strong> ${name}</p>
          <p><strong>Email Address:</strong> ${email}</p>
          <p><strong>Current Plan:</strong> <span style="text-transform: uppercase;">${plan || "UNKNOWN"}</span></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #333;">${message}</div>
          ${attachmentUrl ? `
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Attachment:</strong></p>
          <a href="${attachmentUrl}" target="_blank" style="display:inline-block; padding: 10px 20px; background: #D4AF37; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold;">View Screenshot</a>
          <br/><br/>
          <img src="${attachmentUrl}" alt="User Screenshot" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;" />
          ` : ""}
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Support email delivered successfully");

    return NextResponse.json({ success: true, message: "Message sent successfully" });
  } catch (error: any) {
    console.error("Support API Error:", error.message || error);
    console.error("Error Code:", error.code);
    console.error("Error Response:", error.response);
    return NextResponse.json({ error: "Failed to send message. Please try again later." }, { status: 500 });
  }
}
