import fetch from 'node-fetch';
import { config } from './config';

export async function notify(message: string): Promise<void> {
  console.log(`[NOTIFY] ${message}`);
  if (!config.telegramBotToken || !config.telegramChatId) return;
  try {
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (e) {
    console.error('Telegram notification failed:', e);
  }
}
