import { ethers } from 'ethers';
import { ClobClient, Side } from '@polymarket/clob-client';
import { config } from './config';

let client: ClobClient | null = null;

export async function getClient(): Promise<ClobClient> {
  if (client) return client;

  if (!config.privateKey) {
    throw new Error('PRIVATE_KEY not set');
  }

  const wallet = new ethers.Wallet(config.privateKey);
  const chainId = config.chainId;

  client = new ClobClient(
    config.clobApiUrl,
    chainId,
    wallet as any
  );

  return client;
}

export interface OrderParams {
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number; // in shares
}

export async function placeOrder(params: OrderParams): Promise<string> {
  if (config.paperTrading) {
    const orderId = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[PAPER] Order placed: ${JSON.stringify(params)} -> ${orderId}`);
    return orderId;
  }

  const cl = await getClient();

  // Create and sign order
  const order = await cl.createOrder({
    tokenID: params.tokenId,
    side: params.side === 'BUY' ? Side.BUY : Side.SELL,
    price: params.price,
    size: params.size,
  });

  const resp = await cl.postOrder(order);
  console.log(`[LIVE] Order placed:`, resp);
  return typeof resp === 'object' && resp !== null ? (resp as any).orderID ?? 'unknown' : String(resp);
}

export async function getMarketPrice(tokenId: string): Promise<number | null> {
  try {
    const cl = await getClient();
    const book = await cl.getOrderBook(tokenId);
    if (book && book.bids && book.bids.length > 0) {
      return parseFloat(book.bids[0].price);
    }
    return null;
  } catch {
    return null;
  }
}
