import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      userId, 
      plan 
    } = await req.json();

    // Explicit diagnostic logging as requested
    console.log("=== RAZORPAY VERIFICATION DIAGNOSTICS ===");
    console.log("RAZORPAY KEY:", process.env.RAZORPAY_KEY_ID);
    console.log("RAZORPAY SECRET:", process.env.RAZORPAY_KEY_SECRET ? "Present (Hidden)" : "undefined");
    console.log("========================================");

    if (!userId || !plan) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment parameters" }, { status: 400 });
    }

    const isMock = razorpay_order_id?.startsWith("order_mock");

    // Skip true cryptographic validation if it's our mock order for the demo environment without real keys
    if (!isMock) {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }

      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      // Debugging Logs
      console.log("=== RAZORPAY VERIFICATION LOG ===");
      console.log("razorpay_order_id:", razorpay_order_id);
      console.log("razorpay_payment_id:", razorpay_payment_id);
      console.log("expected_signature:", generatedSignature);
      console.log("razorpay_signature:", razorpay_signature);
      console.log("=================================");

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
      }
    }

    // Determine Expiry
    const now = Date.now();
    const msInDay = 24 * 60 * 60 * 1000;
    const addedDays = plan === "yearly" ? 365 : 30;
    const plan_expiry_date = now + (addedDays * msInDay);

    // Update Securely on Backend via Firebase Admin
    await adminDb.collection("users").doc(userId).collection("settings").doc("profile").set({
      plan: plan === "yearly" ? "pro_yearly" : "pro_monthly",
      plan_expiry_date: plan_expiry_date,
      isPro: true, 
      payment_history: FieldValue.arrayUnion({
        payment_id: razorpay_payment_id || "mock",
        order_id: razorpay_order_id,
        plan: plan,
        date: now
      }) || []
    }, { merge: true });

    return NextResponse.json({ success: true, verified: true });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return NextResponse.json({ error: "Server error during verification" }, { status: 500 });
  }
}
