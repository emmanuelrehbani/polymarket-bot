# Polymarket Near-Certainty Harvester 🤖

A trading bot that finds near-certain outcomes on Polymarket and harvests the remaining 1-5% profit.

## Strategy

The bot identifies markets where outcomes are almost certain but shares haven't reached $1.00:

1. **Expired Events** - Deadlines passed, outcome is clear
2. **Near-Resolution** - One side trading at $0.95+ with high volume
3. **Time Decay** - Deadlines approaching, "No" becomes more likely
4. **Arbitrage** - YES + NO < $1.00, buy both for guaranteed profit

## Risk Management

- Max $20 USDC per market
- Only enter at price ≥ $0.92 (max 8% at risk)
- Portfolio stop: -$30 total
- Max 5 simultaneous positions

## Setup

```bash
cp .env.example .env
# Edit .env with your private key
npm install
npm run build
npm start
```

## Paper Trading

Paper trading is enabled by default (`PAPER_TRADING=true`). The bot simulates trades without placing real orders.

## Files

- `src/config.ts` - Configuration from env vars
- `src/market-scanner.ts` - Scans Gamma API for opportunities
- `src/polymarket-client.ts` - CLOB client wrapper
- `src/risk-manager.ts` - Position sizing and limits
- `src/position-tracker.ts` - Persistent state and P&L tracking
- `src/notifications.ts` - Telegram alerts
- `src/bot.ts` - Main trading loop
- `trading.md` - Trade journal (auto-generated)
