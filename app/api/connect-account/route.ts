import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 30; // 30 seconds wait for MetaApi provision time
export const dynamic = "force-dynamic";

function parseServerSuggestions(details: any): string[] {
  if (!details?.serversByBrokers) return [];
  const suggestions: string[] = [];
  try {
    const brokers = details.serversByBrokers;
    for (const broker of Object.keys(brokers)) {
      const servers = brokers[broker];
      if (Array.isArray(servers)) {
        suggestions.push(...servers);
      }
    }
  } catch { /* ignore parse errors */ }
  return suggestions;
}

export async function POST(req: NextRequest) {
  try {
    const { uid, platform, login, server, password } = await req.json();

    if (!uid || !platform || !login || !server || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const META_API_TOKEN = process.env.META_API_TOKEN;
    if (!META_API_TOKEN) {
      return NextResponse.json({ error: "Server Configuration Error: META_API_TOKEN is missing from your .env.local file! You must create an account at app.metaapi.cloud to use the cloud sync engine." }, { status: 500 });
    }

    const provisionBody = {
      name: `JournalBud - ${platform.toUpperCase()} ${login}`,
      login: String(login),
      password,
      server: server.trim(),
      magic: 1000,
      platform: platform === "mt4" ? "mt4" : "mt5",
      type: "cloud-g2"
    };

    console.log("MetaApi Provisioning:", { name: provisionBody.name, login: provisionBody.login, server: provisionBody.server, platform: provisionBody.platform });

    const provisionRes = await fetch("https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts", {
      method: "POST",
      headers: {
        "auth-token": META_API_TOKEN,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(provisionBody)
    });

    const accountData = await provisionRes.json();

    if (!provisionRes.ok) {
       console.error("MetaApi Provision Error:", JSON.stringify(accountData, null, 2));
       
       // Handle E_SRV_NOT_FOUND — parse the suggested servers into a readable message
       if (accountData.details?.code === "E_SRV_NOT_FOUND") {
         const suggestions = parseServerSuggestions(accountData.details);
         const topSuggestions = suggestions.slice(0, 10);
         const msg = topSuggestions.length > 0 
           ? `Server "${server}" not found. Try one of these exact names: ${topSuggestions.join(", ")}`
           : `Server "${server}" not found. Please check the exact server name in your MT${platform === "mt4" ? "4" : "5"} terminal under File → Login.`;
         return NextResponse.json({ error: msg }, { status: 400 });
       }

       return NextResponse.json({ error: `Provisioning Failed: ${accountData.message || "Invalid credentials or server name."}` }, { status: 400 });
    }

    const accountId = accountData._id || accountData.id;
    const region = accountData.region || "new-york";

    console.log("MetaApi Account Created:", { accountId, region });

    const deployRes = await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/deploy`, {
      method: "POST",
      headers: { "auth-token": META_API_TOKEN }
    });

    if (!deployRes.ok) {
       const deployData = await deployRes.json();
       console.error("MetaApi Deploy Error:", deployData);
       return NextResponse.json({ error: `Cloud Deployment Failed: ${deployData.message || "Unknown deploy error"}` }, { status: 500 });
    }

    console.log("MetaApi Deploy Triggered for:", accountId);

    // Passwords natively vanish here - only the metaApi token is vaulted
    await adminDb.collection("users").doc(uid).collection("accounts").doc(platform).set({
      platform,
      login,
      server: server.trim(),
      metaApiAccountId: accountId,
      metaApiRegion: region,
      connectedAt: Date.now(),
      status: "Deploying..." 
    });

    return NextResponse.json({ success: true, message: "Account provisioned and deploying in cloud." });

  } catch (error: any) {
    console.error("Connect Account (MetaApi) Error:", error?.message || error);
    return NextResponse.json({ error: `Connection failed: ${error?.message || "Unknown error. Check server logs."}` }, { status: 500 });
  }
}
