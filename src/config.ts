import dotenv from 'dotenv';
dotenv.config();

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${key}`);
  return v;
}

export const config = {
  privateKey: env('PRIVATE_KEY', ''),
  clobApiUrl: env('CLOB_API_URL', 'https://clob.polymarket.com'),
  gammaApiUrl: env('GAMMA_API_URL', 'https://gamma-api.polymarket.com'),
  chainId: parseInt(env('CHAIN_ID', '137')),
  paperTrading: env('PAPER_TRADING', 'true') === 'true',
  maxPositionUsdc: parseFloat(env('MAX_POSITION_USDC', '20')),
  minPrice: parseFloat(env('MIN_PRICE', '0.92')),
  portfolioStopLoss: parseFloat(env('PORTFOLIO_STOP_LOSS', '30')),
  maxSimultaneousPositions: parseInt(env('MAX_SIMULTANEOUS_POSITIONS', '5')),
  scanIntervalMs: parseInt(env('SCAN_INTERVAL_MS', '60000')),
  telegramBotToken: env('TELEGRAM_BOT_TOKEN', ''),
  telegramChatId: env('TELEGRAM_CHAT_ID', ''),
  stateFile: env('STATE_FILE', './state.json'),
};
