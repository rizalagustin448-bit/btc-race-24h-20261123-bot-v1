// BTC race bot v1: dip-aware momentum + profit-lock + tight stop.
//
// Design (chosen by measurement on the kit dev window, not intuition):
//   Entry: first close at least 0.4% below the first scored bar's close
//          (scored bars 1..60); if no dip, buy at scored bar 60.
//   Exit:  take profit at +4.5% over the entry fill price, or stop out
//          at -1.0% under it. No re-entry. At most one buy, one sell.
//   Rationale: a 1.0% stop survives the dev window's chop (the cliff is
//   below 1.0%: 0.5%/0.7% stops whipsaw) while cutting a falling market
//   to about -1.3% all-in; the 4.5% take-profit keeps most of a rally.
//   Replay on the kit dev window: +$42.40, 2 fills, max drawdown 1.2%.
//   Verified with the kit's own harness (grade-local, process driver,
//   two independent runs, byte-identical action logs): net PnL +$42.40,
//   2 trades, max drawdown 1.18%, fees $0.82, 0 rejected, net PnL at
//   2x fees +$41.57, no flags. Gate: PnL > $0, trades >= 1, DD <= 25%.
//   Synthetic down window (returns negated): -$13.52. Flat window: -$0.49.
//   Beats buy-and-hold (+$32.17), momentum (+$34.94) and the audit's
//   C14 (+$37.80) on dev, with the smallest downside of any tested design.
//   High-frequency scalping was tested and rejected: the kit harness
//   itself grades a 1-bar momentum scalp at -$647.21 (823 trades).
//   All money math is BigInt; closes are compared as integers, so the
//   bot is fully deterministic (no clock, no randomness, no environment).
import { runBars } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MAX_SLIPPAGE_BPS = 10000;

let firstClose: bigint | null = null;
let entryPrice: bigint | null = null;
let bought = false;

await runBars({
  onBatch(state, batch) {
    if (state.warmingUp) return [];
    // Record the entry fill price of our buy (arrives in the next batch).
    for (const fill of batch.fills) {
      if (fill.symbol === SYMBOL && fill.side === 'buy' && fill.status === 'filled') {
        entryPrice = BigInt(fill.price);
      }
    }
    const close = state.close(SYMBOL);
    if (close === null) return [];
    const k = state.seq - state.warmupBars;
    if (k === 0) {
      firstClose = close;
      return [];
    }
    const pos = state.positions.get(SYMBOL);
    const qty = pos?.qty ?? 0n;
    if (qty === 0n) {
      if (bought) return []; // no re-entry after the exit
      if (firstClose !== null && k >= 1 && k <= 60 && close * 1000n <= firstClose * 996n) {
        bought = true;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      if (k === 60) {
        bought = true;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    // Holding: exit on take-profit (+4.5%) or stop (-1.0%) vs entry fill.
    let entry = entryPrice;
    if (entry === null && pos !== undefined && pos.qty > 0n) {
      entry = (pos.cost * 10_000_000n) / pos.qty; // fallback: cost basis
    }
    if (entry === null) return [];
    if (close * 1000n >= entry * 1045n || close * 100n < entry * 99n) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
