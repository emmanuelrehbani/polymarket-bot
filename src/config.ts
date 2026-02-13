import dotenv from "dotenv";
dotenv.config();

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

export const CONFIG = {
  polygonPrivateKey: env("POLYGON_PRIVATE_KEY"),
  walletAddress: env("WALLET_ADDRESS"),
  polygonRpc: env("POLYGON_RPC"),
  usdcAddress: env("USDC_ADDRESS"),
  clobApiUrl: env("CLOB_API_URL"),
  gammaApiUrl: env("GAMMA_API_URL"),
  telegramBotToken: env("TELEGRAM_BOT_TOKEN"),
  telegramChatId: env("TELEGRAM_CHAT_ID"),
  chainId: parseInt(env("CHAIN_ID", "137")),

  // Strategy
  minPrice: parseFloat(env("MIN_PRICE", "0.95")),
  maxPrice: parseFloat(env("MAX_PRICE", "0.99")),
  maxDaysToEnd: parseInt(env("MAX_DAYS_TO_END", "7")),
  maxPositionSizeUsdc: parseFloat(env("MAX_POSITION_SIZE_USDC", "10")),
  maxConcurrentPositions: parseInt(env("MAX_CONCURRENT_POSITIONS", "5")),
  minLiquidity: parseFloat(env("MIN_LIQUIDITY", "1000")),
  scanIntervalMinutes: parseInt(env("SCAN_INTERVAL_MINUTES", "15")),
  dryRun: env("DRY_RUN", "true") === "true",
} as const;
