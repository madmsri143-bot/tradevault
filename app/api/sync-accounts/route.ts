import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

    const accountsRef = adminDb.collection("users").doc(uid).collection("accounts");
    const accountSnap = await accountsRef.limit(1).get();

    if (accountSnap.empty) return NextResponse.json({ error: "No connected account found" }, { status: 404 });

    const accountDoc = accountSnap.docs[0];
    const account = accountDoc.data();

    const META_API_TOKEN = process.env.META_API_TOKEN;
    if (!META_API_TOKEN) return NextResponse.json({ error: "Missing META_API_TOKEN" }, { status: 500 });
    
    if (!account.metaApiAccountId) {
       return NextResponse.json({ error: "Legacy account structure detected. Please reconnect using the cloud infrastructure." }, { status: 400 });
    }

    // Step 1: Verify Deployment Status from MetaApi
    const statusRes = await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${account.metaApiAccountId}`, {
        headers: { "auth-token": META_API_TOKEN }
    });
    
    if (!statusRes.ok) {
       return NextResponse.json({ error: "Failed to ping MetaApi status. Check Token or Account ID." }, { status: 500 });
    }
    
    const statusData = await statusRes.json();
    
    if (statusData.state !== "DEPLOYED") {
         await accountDoc.ref.update({ status: "Deploying..." });
         return new NextResponse(JSON.stringify({ syncedAt: account.lastSyncTime || Date.now() }), { status: 304 });
    }

    if (statusData.connectionStatus !== "CONNECTED") {
         await accountDoc.ref.update({ status: "Connecting..." });
         return new NextResponse(JSON.stringify({ syncedAt: account.lastSyncTime || Date.now() }), { status: 304 });
    }

    // Step 2: Fetch History Matches
    const lastSyncMs = account.lastSyncTime || (Date.now() - 30 * 24 * 60 * 60 * 1000); 
    const lastSyncDate = new Date(lastSyncMs);
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    
    const region = account.metaApiRegion || "new-york"; 

    const historyRes = await fetch(`https://mt-client-api-v1.${region}.agiliumtrade.agiliumtrade.ai/users/current/accounts/${account.metaApiAccountId}/history-deals/time/${lastSyncDate.toISOString()}/${endDate.toISOString()}`, {
        headers: { "auth-token": META_API_TOKEN }
    });

    if (!historyRes.ok) {
       const errBody = await historyRes.json();
       console.error("MetaApi History Error:", errBody);
       await accountDoc.ref.update({ status: "Error" });
       return NextResponse.json({ error: `History fetch failed: ${errBody.message || "Region Routing Error"}` }, { status: 500 });
    }

    const historyData = await historyRes.json();
    const rawDeals = Array.isArray(historyData) ? historyData : (historyData.deals || [])

    if (rawDeals.length === 0) {
      await accountDoc.ref.update({ status: "Connected" });
      return new NextResponse(JSON.stringify({ syncedAt: account.lastSyncTime || Date.now() }), { status: 304 });
    }

    // Step 3: Parse and Deduplicate
    const tradesRef = adminDb.collection("users").doc(uid).collection("trades");
    const batch = adminDb.batch();
    let addedCount = 0;

    for (const d of rawDeals) {
      if (d.entryType !== 'DEAL_ENTRY_OUT' && d.entryType !== 'DEAL_ENTRY_INOUT') continue;

      const tradeId = d.id || String(d.ticket);
      const checkDupe = await tradesRef.where("trade_id", "==", tradeId).limit(1).get();
      if (!checkDupe.empty) continue;

      const pnl = (d.profit || 0) + (d.commission || 0) + (d.swap || 0);
      const posType = d.type === 'DEAL_TYPE_BUY' ? 'sell' : 'buy'; 

      const newRef = tradesRef.doc(tradeId); 
      batch.set(newRef, {
        trade_id: tradeId,
        symbol: d.symbol || "",
        type: posType,
        result: pnl > 0 ? "Profit" : "Loss",
        pnl: pnl,
        lot: d.volume || 0,
        entryPrice: 0,
        exitPrice: d.price || 0,
        currency: "USD",
        note: `Auto-synced from MT Cloud`,
        date: new Date(d.time).getTime(),
        createdAt: Date.now(),
        stopLossFollowed: pnl < 0 ? true : null,
        raw_commission: d.commission,
        raw_swap: d.swap,
      });
      addedCount++;
    }

    const syncedAt = Date.now();
    batch.update(accountDoc.ref, { lastSyncTime: syncedAt, status: "Connected" });

    if (addedCount === 0) {
      return new NextResponse(JSON.stringify({ syncedAt }), { status: 304 });
    }
    
    await batch.commit();
    return NextResponse.json({ success: true, syncedAt, addedCount });

  } catch (error: any) {
    console.error("MetaApi Sync Loop Error:", error);
    return NextResponse.json({ error: "Internal server error syncing accounts" }, { status: 500 });
  }
}
