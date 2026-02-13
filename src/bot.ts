import { config } from './config';
import { scanMarkets, MarketOpportunity } from './market-scanner';
import { checkRisk } from './risk-manager';
import { loadState, saveState, addPosition, getOpenPositions, closePosition, logTrade, Position, State } from './position-tracker';
import { placeOrder } from './polymarket-client';
import { notify } from './notifications';

let state: State;

async function handleOpportunity(opp: MarketOpportunity): Promise<void> {
  const risk = checkRisk(state, opp.price, opp.marketId);
  if (!risk.allowed) {
    console.log(`[SKIP] ${opp.question.slice(0, 50)} - ${risk.reason}`);
    return;
  }

  const shares = risk.positionSize / opp.price;

  console.log(`[TRADE] ${opp.strategy}: ${opp.outcome} on "${opp.question.slice(0, 50)}" @ $${opp.price} ($${risk.positionSize})`);

  try {
    // In paper trading, we use a dummy token ID
    const tokenId = opp.conditionId || opp.marketId;
    await placeOrder({
      tokenId,
      side: 'BUY',
      price: opp.price,
      size: shares,
    });

    const pos: Position = {
      marketId: opp.marketId,
      conditionId: opp.conditionId,
      question: opp.question,
      outcome: opp.outcome,
      entryPrice: opp.price,
      size: risk.positionSize,
      shares,
      enteredAt: new Date().toISOString(),
      status: 'open',
    };

    addPosition(state, pos);
    logTrade(pos);

    const mode = config.paperTrading ? '📝 PAPER' : '💰 LIVE';
    await notify(
      `${mode} *BUY ${opp.outcome}*\n` +
      `📊 ${opp.question.slice(0, 60)}\n` +
      `💵 $${opp.price.toFixed(3)} × ${shares.toFixed(1)} shares ($${risk.positionSize})\n` +
      `🎯 Strategy: ${opp.strategy} (score: ${opp.score.toFixed(0)})`
    );
  } catch (e) {
    console.error('Order failed:', e);
    await notify(`❌ Order failed: ${opp.question.slice(0, 40)} - ${e}`);
  }
}

async function checkPositions(): Promise<void> {
  const open = getOpenPositions(state);
  for (const pos of open) {
    // In paper trading, simulate resolution: if position is >1h old, auto-close at $1.00
    if (config.paperTrading) {
      const age = Date.now() - new Date(pos.enteredAt).getTime();
      if (age > 60 * 60 * 1000) {
        const closed = closePosition(state, pos.marketId, 1.0);
        if (closed) {
          logTrade(closed);
          await notify(
            `✅ *CLOSED* ${pos.outcome} on ${pos.question.slice(0, 40)}\n` +
            `Entry: $${pos.entryPrice.toFixed(3)} → Exit: $1.00\n` +
            `PnL: $${closed.pnl?.toFixed(2)} | Total: $${state.totalPnl.toFixed(2)}`
          );
        }
      }
    }
    // TODO: In live mode, check actual market prices for exit conditions
  }
}

export async function runOnce(): Promise<void> {
  console.log(`[SCAN] ${new Date().toISOString()} - Scanning markets...`);

  try {
    const opportunities = await scanMarkets();
    console.log(`[SCAN] Found ${opportunities.length} opportunities`);

    // Take top opportunities
    for (const opp of opportunities.slice(0, 3)) {
      await handleOpportunity(opp);
    }

    await checkPositions();

    state.lastScanAt = new Date().toISOString();
    saveState(state);
  } catch (e) {
    console.error('Scan cycle failed:', e);
  }
}

export async function startBot(): Promise<void> {
  state = loadState();
  const mode = config.paperTrading ? '📝 PAPER TRADING' : '💰 LIVE TRADING';

  await notify(
    `🤖 *Polymarket Bot Started*\n` +
    `Mode: ${mode}\n` +
    `Max position: $${config.maxPositionUsdc}\n` +
    `Min price: $${config.minPrice}\n` +
    `Portfolio stop: -$${config.portfolioStopLoss}\n` +
    `Scan interval: ${config.scanIntervalMs / 1000}s`
  );

  // Initial scan
  await runOnce();

  // Loop
  setInterval(runOnce, config.scanIntervalMs);
}
