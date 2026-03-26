```typescript
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  try {
    const { plan, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!plan || (plan !== "monthly" && plan !== "yearly")) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const amount = plan === "yearly" ? 1999 : 299; // Amount in INR

    // Verify razorpay instance
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      // Mock order for demo purposes if keys aren't added
      console.warn("⚠️ Razorpay keys missing. Simulating order.");
      return NextResponse.json({
        id: "order_mock" + Math.floor(Math.random() * 1000000),
        amount: amount * 100,
        currency: "INR",
        mock: true
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // paise 
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        userId,
        plan
      }
    };

    const order = await razorpay.orders.create(options);
    
    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
