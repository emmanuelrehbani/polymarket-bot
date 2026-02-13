import { startBot } from './bot';

console.log('🤖 Polymarket Near-Certainty Harvester');
console.log('======================================');

startBot().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
