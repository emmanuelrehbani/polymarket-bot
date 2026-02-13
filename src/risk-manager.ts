import { config } from './config';
import { State, getOpenPositions } from './position-tracker';

export interface RiskCheck {
  allowed: boolean;
  reason?: string;
  positionSize: number;
}

export function checkRisk(state: State, price: number, marketId: string): RiskCheck {
  const openPositions = getOpenPositions(state);

  // Portfolio stop loss
  if (state.totalPnl <= -config.portfolioStopLoss) {
    return { allowed: false, reason: `Portfolio stop hit: $${state.totalPnl.toFixed(2)}`, positionSize: 0 };
  }

  // Max simultaneous positions
  if (openPositions.length >= config.maxSimultaneousPositions) {
    return { allowed: false, reason: `Max positions reached: ${openPositions.length}`, positionSize: 0 };
  }

  // Already in this market
  if (openPositions.some((p) => p.marketId === marketId)) {
    return { allowed: false, reason: 'Already in this market', positionSize: 0 };
  }

  // Min price check
  if (price < config.minPrice) {
    return { allowed: false, reason: `Price ${price} below min ${config.minPrice}`, positionSize: 0 };
  }

  // Position size: spend up to maxPositionUsdc
  const positionSize = Math.min(config.maxPositionUsdc, config.maxPositionUsdc);

  return { allowed: true, positionSize };
}
