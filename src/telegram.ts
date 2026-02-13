import axios from "axios";
import { CONFIG } from "./config";

const API = `https://api.telegram.org/bot${CONFIG.telegramBotToken}`;

export async function sendTelegram(message: string): Promise<void> {
  try {
    await axios.post(`${API}/sendMessage`, {
      chat_id: CONFIG.telegramChatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (err: any) {
    console.error("Telegram error:", err.message);
  }
}

export async function notifyOpportunity(market: {
  question: string;
  price: number;
  endDate: string;
  slug: string;
  potentialProfit: number;
  size: number;
}): Promise<void> {
  const msg = [
    `🎯 <b>Polymarket Opportunity</b>`,
    ``,
    `📊 ${market.question}`,
    `💰 Price: ${(market.price * 100).toFixed(1)}¢`,
    `📈 Potential profit: ${(market.potentialProfit * 100).toFixed(2)}%`,
    `💵 Position: $${market.size.toFixed(2)}`,
    `📅 Ends: ${new Date(market.endDate).toLocaleDateString()}`,
    `🔗 https://polymarket.com/event/${market.slug}`,
  ].join("\n");
  await sendTelegram(msg);
}

export async function notifyTrade(trade: {
  question: string;
  side: string;
  price: number;
  size: number;
  orderId: string;
}): Promise<void> {
  const msg = [
    `✅ <b>Order Placed</b>`,
    ``,
    `📊 ${trade.question}`,
    `📋 ${trade.side} @ ${(trade.price * 100).toFixed(1)}¢`,
    `💵 Size: ${trade.size} shares`,
    `🆔 ${trade.orderId}`,
  ].join("\n");
  await sendTelegram(msg);
}

export async function notifyError(context: string, error: string): Promise<void> {
  await sendTelegram(`⚠️ <b>Polymarket Bot Error</b>\n\n${context}\n<code>${error}</code>`);
}

export async function notifyStartup(): Promise<void> {
  const mode = CONFIG.dryRun ? "🧪 DRY RUN" : "🔴 LIVE";
  await sendTelegram(
    [
      `🤖 <b>Polymarket Bot Started</b>`,
      ``,
      `Mode: ${mode}`,
      `Price range: ${CONFIG.minPrice * 100}-${CONFIG.maxPrice * 100}¢`,
      `Max position: $${CONFIG.maxPositionSizeUsdc}`,
      `Max concurrent: ${CONFIG.maxConcurrentPositions}`,
      `Scan interval: ${CONFIG.scanIntervalMinutes}min`,
    ].join("\n")
  );
}
