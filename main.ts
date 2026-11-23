// BTC race 24h bot: one early unconditional buy, one wide disaster stop, no take-profit.
//
// Idea: the dev window is only a gate (net PnL > 0), never the ranking. The race window
// is unseen, so the design is judged by how it behaves on windows it has never seen,
// not by squeezing the dev number. Every extra trade pays ~26 bps in fee, slippage and
// impact, and the dev window shows 1-minute moves above that cost only 15 times in
// 1,440 bars, so the bot trades at most twice: one buy, at most one sell.
//
//   - Entry: buy 100% of cash on the second bar it sees. Unconditional. A bot that
//     waits for a dip may never enter on a window that rises in a straight line, and
//     zero trades fails the race guardrail outright.
//   - Stop: sell everything if a close prints more than 5% below the buy's fill price.
//     Wide on purpose. It is disqualification insurance only (the race guardrail caps
//     drawdown at 25%): in a window that keeps falling it banks the loss near -5%
//     instead of riding it to -10% or worse, and in a window that only chops it never
//     fires at all (the dev window's worst drawdown from entry is under 2%).
//   - No take-profit: a 24h BTC window can run 5-10%, and the ranking is pure net PnL,
//     so capping the upside at any fixed percent cuts off exactly the tail that decides
//     first place. The position rides to the end and is flattened there by the harness.
//
// All amounts are BigInt, all comparisons are exact cross-multiplications, and nothing
// reads the clock, the environment or any randomness, so two runs answer identically.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Buy on the second bar the bot sees (batch seq 1 on a window with no warm-up). */
const ENTRY_BAR_SEEN = 2;
/** Disaster stop: sell all when a close is this far below the buy's fill price. */
const STOP_BPS = 500;
const STOP_DEN = 10_000;
/** Never let an order be refused for slippage: the fill can move at most this far. */
const MAX_SLIPPAGE_BPS = 10_000;

let barsSeen = 0;
let buySent = false;
let entryPrice: bigint | null = null;

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    // The fills of the previous batch's orders arrive here: record the buy's fill
    // price, the only reference the stop is measured against.
    for (const fill of batch.fills) {
      if (fill.side === 'buy' && fill.status === 'filled') entryPrice = BigInt(fill.price);
    }
    for (const bar of batch.bars) if (bar.symbol === SYMBOL) barsSeen++;
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (!buySent && barsSeen >= ENTRY_BAR_SEEN && state.cash > 0n) {
      buySent = true;
      // Spend all cash, but never past the position-weight room: if the caps
      // allow less than 100% of equity in one position, buy that room instead
      // of sending an order the harness would refuse for max_weight.
      const room = state.weightRoom(SYMBOL);
      const notional = state.cash < room ? state.cash : room;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    if (entryPrice !== null && held !== undefined && held.qty > 0n) {
      const close = state.close(SYMBOL);
      if (close !== null && close * BigInt(STOP_DEN) < entryPrice * BigInt(STOP_DEN - STOP_BPS)) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
    return [];
  },
});
