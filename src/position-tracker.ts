import fs from 'fs';
import { config } from './config';

export interface Position {
  marketId: string;
  conditionId: string;
  question: string;
  outcome: 'YES' | 'NO';
  entryPrice: number;
  size: number; // USDC spent
  shares: number;
  enteredAt: string;
  status: 'open' | 'closed';
  exitPrice?: number;
  pnl?: number;
  closedAt?: string;
}

export interface State {
  positions: Position[];
  totalPnl: number;
  totalTrades: number;
  lastScanAt: string;
}

const defaultState: State = {
  positions: [],
  totalPnl: 0,
  totalTrades: 0,
  lastScanAt: new Date().toISOString(),
};

export function loadState(): State {
  try {
    if (fs.existsSync(config.stateFile)) {
      return JSON.parse(fs.readFileSync(config.stateFile, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return { ...defaultState };
}

export function saveState(state: State): void {
  fs.writeFileSync(config.stateFile, JSON.stringify(state, null, 2));
}

export function getOpenPositions(state: State): Position[] {
  return state.positions.filter((p) => p.status === 'open');
}

export function closePosition(
  state: State,
  marketId: string,
  exitPrice: number
): Position | null {
  const pos = state.positions.find(
    (p) => p.marketId === marketId && p.status === 'open'
  );
  if (!pos) return null;
  pos.status = 'closed';
  pos.exitPrice = exitPrice;
  pos.pnl = pos.shares * exitPrice - pos.size;
  pos.closedAt = new Date().toISOString();
  state.totalPnl += pos.pnl;
  saveState(state);
  return pos;
}

export function addPosition(state: State, pos: Position): void {
  state.positions.push(pos);
  state.totalTrades++;
  saveState(state);
}

export function logTrade(pos: Position): void {
  const line = `| ${new Date().toISOString().slice(0, 16)} | ${pos.question.slice(0, 40)} | ${pos.outcome} | $${pos.entryPrice.toFixed(3)} | $${pos.size.toFixed(2)} | ${pos.status} | ${pos.pnl !== undefined ? '$' + pos.pnl.toFixed(2) : '-'} |\n`;
  const file = './trading.md';
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      '# Trading Journal\n\n| Time | Market | Side | Price | Size | Status | PnL |\n|------|--------|------|-------|------|--------|-----|\n'
    );
  }
  fs.appendFileSync(file, line);
}
