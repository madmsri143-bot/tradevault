import { NextResponse } from 'next/server';
import { sendEmail } from '@/email';

export async function POST(req: Request) {
  try {
    const { name, email, subject, message, plan } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    const emailSubject = `TradeVault Support Request: ${subject || 'General Inquiry'}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
        <h2>New Support Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Plan:</strong> ${plan || 'Unknown'}</p>
        <p><strong>Subject:</strong> ${subject || 'None'}</p>
        <hr />
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
    `;

    // Send the email to the hardcoded admin email address
    await sendEmail("madmsri143@gmail.com", emailSubject, htmlContent);

    return NextResponse.json({ success: true, message: 'Support request sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Support API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
