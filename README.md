# Polymarket Prediction Bot

Bot that finds "near-certain" markets on Polymarket (outcomes trading at 95-99 cents) and buys them for 1-5% near-guaranteed profit.

## Strategy
1. Scans all active markets via Gamma API
2. Finds outcomes priced 0.95-0.99 (95-99 cents)
3. Checks market end date is within configured days
4. Buys the high-probability outcome via CLOB API
5. Waits for resolution → collects $1.00 per share

## Setup
```bash
cp .env.example .env  # Edit with your keys
npm install
npm run build
npm start
```

## PM2
```bash
npm run build
pm2 start ecosystem.config.js
```

## Config (.env)
- `DRY_RUN=true` — Set to false for live trading
- `MIN_PRICE` / `MAX_PRICE` — Price range filter (0.95-0.99)
- `MAX_DAYS_TO_END` — Max days until market resolution
- `MAX_POSITION_SIZE_USDC` — Max USDC per position
- `MAX_CONCURRENT_POSITIONS` — Max simultaneous positions
