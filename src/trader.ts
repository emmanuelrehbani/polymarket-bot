import { ClobClient, ApiKeyCreds, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";
import { CONFIG } from "./config";
import { Opportunity } from "./scanner";
import { notifyTrade, notifyError } from "./telegram";

let clobClient: ClobClient | null = null;

export async function initTrader(): Promise<void> {
  const signer = new Wallet(CONFIG.polygonPrivateKey);

  console.log("Deriving API credentials...");
  const creds: ApiKeyCreds = await new ClobClient(
    CONFIG.clobApiUrl,
    CONFIG.chainId,
    signer
  ).createOrDeriveApiKey();

  console.log("API credentials derived successfully");

  // signatureType 0 = EOA wallet
  clobClient = new ClobClient(
    CONFIG.clobApiUrl,
    CONFIG.chainId,
    signer,
    creds,
    0, // EOA
    CONFIG.walletAddress
  );

  console.log("CLOB client initialized");
}

export function getClient(): ClobClient {
  if (!clobClient) throw new Error("Trader not initialized");
  return clobClient;
}

// Track active positions
const activePositions = new Map<string, { tokenId: string; size: number; price: number }>();

export function getActivePositionCount(): number {
  return activePositions.size;
}

export async function executeTrade(opp: Opportunity): Promise<string | null> {
  if (!clobClient) throw new Error("Trader not initialized");

  // Check position limits
  if (activePositions.size >= CONFIG.maxConcurrentPositions) {
    console.log("Max concurrent positions reached, skipping");
    return null;
  }

  // Skip if already have position in this market
  if (activePositions.has(opp.market.id)) {
    console.log(`Already have position in ${opp.market.question}`);
    return null;
  }

  // Calculate size: how many shares we can buy
  const maxShares = Math.floor(CONFIG.maxPositionSizeUsdc / opp.price);
  if (maxShares < 1) {
    console.log("Position too small, skipping");
    return null;
  }

  console.log(
    `\n📊 Trading: ${opp.market.question}` +
    `\n   Outcome: ${opp.outcomeName} @ ${(opp.price * 100).toFixed(1)}¢` +
    `\n   Size: ${maxShares} shares ($${(maxShares * opp.price).toFixed(2)})` +
    `\n   Potential profit: ${(opp.potentialProfit * 100).toFixed(2)}%` +
    `\n   Days to end: ${opp.daysToEnd.toFixed(1)}`
  );

  if (CONFIG.dryRun) {
    console.log("   🧪 DRY RUN - not placing order");
    return "dry-run-" + Date.now();
  }

  try {
    const resp = await clobClient.createAndPostOrder(
      {
        tokenID: opp.tokenId,
        price: opp.price,
        side: Side.BUY,
        size: maxShares,
      },
      {
        tickSize: opp.tickSize,
        negRisk: opp.negRisk,
      },
      OrderType.GTC
    );

    const orderId = resp?.orderID ?? resp?.orderIds?.[0] ?? "unknown";
    console.log(`   ✅ Order placed: ${orderId}`);

    activePositions.set(opp.market.id, {
      tokenId: opp.tokenId,
      size: maxShares,
      price: opp.price,
    });

    await notifyTrade({
      question: opp.market.question,
      side: `BUY ${opp.outcomeName}`,
      price: opp.price,
      size: maxShares,
      orderId,
    });

    return orderId;
  } catch (err: any) {
    console.error(`   ❌ Order failed: ${err.message}`);
    await notifyError(
      `Failed to place order for ${opp.market.question}`,
      err.message
    );
    return null;
  }
}

export async function checkOpenOrders(): Promise<void> {
  if (!clobClient) return;

  try {
    const orders = await clobClient.getOpenOrders();
    console.log(`Open orders: ${orders?.length ?? 0}`);
  } catch (err: any) {
    console.error("Error checking orders:", err.message);
  }
}
