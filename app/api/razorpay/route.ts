import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Defensive check so the whole app doesn't crash if env vars aren't set yet during development
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn("Razorpay credentials not found! Ensure they are set in .env.local");
      return NextResponse.json({ 
        error: "Server configuration missing Razorpay keys" 
      }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const body = await req.json();
    const { plan } = body; // 'monthly' or 'yearly'

    let amount = 0;
    if (plan === "monthly") amount = 300; // $3 in cents
    else if (plan === "yearly") amount = 2100; // $21 in cents
    else return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const options = {
      amount,
      currency: "USD",
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (err: any) {
    console.error("Razorpay order error:", err);
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
}
