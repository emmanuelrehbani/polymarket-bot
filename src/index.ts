import { CONFIG } from "./config";
import { fetchActiveMarkets, findOpportunities } from "./scanner";
import { initTrader, executeTrade, getActivePositionCount, checkOpenOrders } from "./trader";
import { notifyStartup, notifyError, notifyOpportunity, sendTelegram } from "./telegram";

async function runScan(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔍 Scanning at ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const markets = await fetchActiveMarkets();
    const opportunities = findOpportunities(markets);

    if (opportunities.length === 0) {
      console.log("No opportunities found this scan");
      return;
    }

    console.log(`\n🎯 Top opportunities:`);
    for (const opp of opportunities.slice(0, 10)) {
      console.log(
        `  ${(opp.price * 100).toFixed(1)}¢ | +${(opp.potentialProfit * 100).toFixed(2)}% | ` +
        `${opp.daysToEnd.toFixed(1)}d | ${opp.market.question.slice(0, 60)}`
      );
    }

    // Execute trades on top opportunities
    const positionsAvailable = CONFIG.maxConcurrentPositions - getActivePositionCount();
    const tradeCandidates = opportunities.slice(0, positionsAvailable);

    for (const opp of tradeCandidates) {
      await notifyOpportunity({
        question: opp.market.question,
        price: opp.price,
        endDate: opp.market.endDate,
        slug: opp.market.slug,
        potentialProfit: opp.potentialProfit,
        size: Math.floor(CONFIG.maxPositionSizeUsdc / opp.price) * opp.price,
      });

      await executeTrade(opp);

      // Small delay between orders
      await new Promise((r) => setTimeout(r, 2000));
    }

    await checkOpenOrders();
  } catch (err: any) {
    console.error("Scan error:", err.message);
    await notifyError("Scan cycle failed", err.message);
  }
}

async function main(): Promise<void> {
  console.log("🤖 Polymarket Prediction Bot starting...");
  console.log(`Mode: ${CONFIG.dryRun ? "DRY RUN" : "LIVE"}`);

  try {
    await initTrader();
    await notifyStartup();
  } catch (err: any) {
    console.error("Failed to initialize trader:", err.message);
    await notifyError("Failed to initialize trader", err.message);
    // Continue in scan-only mode
    console.log("Running in scan-only mode (no trading)");
  }

  // Run first scan immediately
  await runScan();

  // Schedule periodic scans
  const intervalMs = CONFIG.scanIntervalMinutes * 60 * 1000;
  console.log(`\n⏰ Next scan in ${CONFIG.scanIntervalMinutes} minutes`);

  setInterval(async () => {
    await runScan();
    console.log(`\n⏰ Next scan in ${CONFIG.scanIntervalMinutes} minutes`);
  }, intervalMs);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
