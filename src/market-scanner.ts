import fetch from 'node-fetch';
import { config } from './config';

export interface MarketOpportunity {
  marketId: string;
  conditionId: string;
  question: string;
  outcome: 'YES' | 'NO';
  price: number;
  strategy: 'expired' | 'near-resolution' | 'time-decay' | 'arbitrage';
  score: number; // 0-100, higher = better
  endDate?: string;
  volume?: number;
}

interface GammaMarket {
  id: string;
  condition_id: string;
  question: string;
  end_date_iso: string;
  active: boolean;
  closed: boolean;
  tokens: Array<{
    token_id: string;
    outcome: string;
    price: number;
  }>;
  volume_num_24hr?: number;
  liquidity_num?: number;
  [key: string]: unknown;
}

export async function scanMarkets(): Promise<MarketOpportunity[]> {
  const opportunities: MarketOpportunity[] = [];
  const now = new Date();

  try {
    // Fetch active markets
    const resp = await fetch(`${config.gammaApiUrl}/markets?active=true&closed=false&limit=100`);
    if (!resp.ok) {
      console.error(`Gamma API error: ${resp.status}`);
      return [];
    }
    const markets = (await resp.json()) as GammaMarket[];

    for (const market of markets) {
      if (!market.tokens || market.tokens.length < 2) continue;

      const yesToken = market.tokens.find((t) => t.outcome === 'Yes');
      const noToken = market.tokens.find((t) => t.outcome === 'No');
      if (!yesToken || !noToken) continue;

      const yesPrice = yesToken.price;
      const noPrice = noToken.price;
      const endDate = market.end_date_iso ? new Date(market.end_date_iso) : null;

      // Strategy 1: Expired events - end date has passed
      if (endDate && endDate < now) {
        // If YES is high, the event likely happened - buy YES
        if (yesPrice >= config.minPrice && yesPrice < 1.0) {
          opportunities.push({
            marketId: market.id,
            conditionId: market.condition_id,
            question: market.question,
            outcome: 'YES',
            price: yesPrice,
            strategy: 'expired',
            score: 95 + (yesPrice - 0.92) * 50, // Higher price = more certain
            endDate: market.end_date_iso,
          });
        }
        // If NO is high, event didn't happen - buy NO
        if (noPrice >= config.minPrice && noPrice < 1.0) {
          opportunities.push({
            marketId: market.id,
            conditionId: market.condition_id,
            question: market.question,
            outcome: 'NO',
            price: noPrice,
            strategy: 'expired',
            score: 95 + (noPrice - 0.92) * 50,
            endDate: market.end_date_iso,
          });
        }
      }

      // Strategy 2: Near-resolution - one side very high with volume
      if (yesPrice >= 0.95 && yesPrice < 1.0) {
        opportunities.push({
          marketId: market.id,
          conditionId: market.condition_id,
          question: market.question,
          outcome: 'YES',
          price: yesPrice,
          strategy: 'near-resolution',
          score: 70 + (yesPrice - 0.92) * 200,
          volume: market.volume_num_24hr,
        });
      }
      if (noPrice >= 0.95 && noPrice < 1.0) {
        opportunities.push({
          marketId: market.id,
          conditionId: market.condition_id,
          question: market.question,
          outcome: 'NO',
          price: noPrice,
          strategy: 'near-resolution',
          score: 70 + (noPrice - 0.92) * 200,
          volume: market.volume_num_24hr,
        });
      }

      // Strategy 3: Time decay - deadline within 48h, NO is high
      if (endDate) {
        const hoursLeft = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursLeft > 0 && hoursLeft <= 48 && noPrice >= config.minPrice && noPrice < 1.0) {
          const timeScore = Math.max(0, 80 - hoursLeft); // Closer deadline = higher score
          opportunities.push({
            marketId: market.id,
            conditionId: market.condition_id,
            question: market.question,
            outcome: 'NO',
            price: noPrice,
            strategy: 'time-decay',
            score: timeScore + (noPrice - 0.92) * 100,
            endDate: market.end_date_iso,
          });
        }
      }

      // Strategy 4: Arbitrage - YES + NO < 1.0
      if (yesPrice + noPrice < 0.99) {
        const profit = 1.0 - yesPrice - noPrice;
        opportunities.push({
          marketId: market.id,
          conditionId: market.condition_id,
          question: market.question,
          outcome: 'YES', // Buy both sides
          price: yesPrice,
          strategy: 'arbitrage',
          score: profit * 1000, // Higher profit = higher score
        });
      }
    }
  } catch (e) {
    console.error('Market scan failed:', e);
  }

  // Sort by score descending
  opportunities.sort((a, b) => b.score - a.score);
  return opportunities;
}
