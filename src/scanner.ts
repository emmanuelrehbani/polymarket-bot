import axios from "axios";
import { CONFIG } from "./config";

export interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  conditionId: string;
  endDate: string;
  outcomes: string; // JSON string like '["Yes","No"]'
  outcomePrices: string; // JSON string like '["0.95","0.05"]'
  active: boolean;
  closed: boolean;
  volume: string;
  volumeNum: number;
  liquidityNum: number;
  clobTokenIds: string; // JSON string of token IDs
  acceptingOrders?: boolean;
  enableOrderBook?: boolean;
  orderPriceMinTickSize?: number;
  negRisk?: boolean;
  events?: Array<{ negRisk?: boolean; enableNegRisk?: boolean }>;
}

export interface Opportunity {
  market: GammaMarket;
  outcomeIndex: number;
  outcomeName: string;
  price: number;
  tokenId: string;
  potentialProfit: number;
  daysToEnd: number;
  tickSize: "0.1" | "0.01" | "0.001" | "0.0001";
  negRisk: boolean;
}

export async function fetchActiveMarkets(): Promise<GammaMarket[]> {
  const allMarkets: GammaMarket[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    try {
      const { data } = await axios.get<GammaMarket[]>(
        `${CONFIG.gammaApiUrl}/markets`,
        {
          params: {
            active: true,
            closed: false,
            limit,
            offset,
          },
          timeout: 30000,
        }
      );

      if (!data || data.length === 0) break;
      allMarkets.push(...data);
      offset += limit;

      // Safety: don't fetch more than 2000 markets
      if (offset >= 2000) break;
    } catch (err: any) {
      console.error(`Error fetching markets at offset ${offset}:`, err.message);
      break;
    }
  }

  console.log(`Fetched ${allMarkets.length} active markets`);
  return allMarkets;
}

export function findOpportunities(markets: GammaMarket[]): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const now = Date.now();

  for (const market of markets) {
    try {
      // Skip closed or inactive
      if (market.closed || !market.active) continue;

      // Must have CLOB token IDs
      if (!market.clobTokenIds) continue;

      // Parse prices and outcomes
      let prices: number[];
      let outcomes: string[];
      let tokenIds: string[];

      try {
        prices = JSON.parse(market.outcomePrices).map(Number);
        outcomes = JSON.parse(market.outcomes);
        tokenIds = JSON.parse(market.clobTokenIds);
      } catch {
        continue;
      }

      if (prices.length !== outcomes.length || prices.length !== tokenIds.length) continue;

      // Check end date
      if (!market.endDate) continue;
      const endDate = new Date(market.endDate);
      if (isNaN(endDate.getTime())) continue;
      const daysToEnd = (endDate.getTime() - now) / (1000 * 60 * 60 * 24);

      // Must end within configured days and be in the future
      if (daysToEnd < 0 || daysToEnd > CONFIG.maxDaysToEnd) continue;

      // Check minimum liquidity
      if (market.liquidityNum < CONFIG.minLiquidity) continue;

      // Find high-probability outcomes
      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        if (price >= CONFIG.minPrice && price <= CONFIG.maxPrice) {
          // Determine negRisk from market or event
          const negRisk = market.negRisk ??
            market.events?.[0]?.negRisk ??
            market.events?.[0]?.enableNegRisk ??
            false;

          // Determine tick size
          const tickSizeMap: Record<number, "0.1" | "0.01" | "0.001" | "0.0001"> = {
            1: "0.1", 2: "0.01", 3: "0.001", 4: "0.0001",
          };
          const tickSize = tickSizeMap[market.orderPriceMinTickSize ?? 2] ?? "0.01";

          opportunities.push({
            market,
            outcomeIndex: i,
            outcomeName: outcomes[i],
            price,
            tokenId: tokenIds[i],
            potentialProfit: (1 - price) / price,
            daysToEnd,
            tickSize,
            negRisk,
          });
        }
      }
    } catch (err) {
      // Skip problematic markets
      continue;
    }
  }

  // Sort by potential profit descending
  opportunities.sort((a, b) => b.potentialProfit - a.potentialProfit);

  console.log(`Found ${opportunities.length} opportunities`);
  return opportunities;
}
