# BTC Race 24h Trading Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node-22-green.svg)](https://nodejs.org/)
[![make.fun](https://img.shields.io/badge/make.fun-bounty-blue.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)

A bot that trades Coinbase Wrapped BTC (cbBTC) on 1-minute on-chain prices with $1,000 of paper money, built for the make.fun "Race a BTC trading bot live for 24 hours" bounty. Simulation only — no real money is traded.

## Strategy

Dip-aware momentum with profit-lock and a tight stop, at most 2 fills:

- **Entry (bars 1–60):** buy 100% at the first close at least 0.4% below the bar-0 close; if no dip by bar 60, buy at bar 60 (fallback guarantees at least 1 trade in any window).
- **Take-profit:** sell everything at close ≥ entry × 1.045.
- **Stop-loss:** sell everything at close < entry × 0.99.
- **No re-entry.** Total fees about $0.82.

## Dev window grade

Local harness grade on the frozen 24-hour dev window: **net PnL +$42.40**, 2 trades, max drawdown 1.18%, 0 rejected orders. Deterministic: repeated runs produce byte-identical action logs. All amounts use BigInt; floats are only used for indicators.

## Run

```sh
node main.ts
```

The bot reads one JSON line per minute (a 1-minute bar of cbBTC in dollars from its Orca Whirlpool on Solana) and answers with buy and sell orders. Standard library plus the vendored SDK shim in `vendor/` only — nothing is installed, no network, no wall clock, no files outside the repository.

## License

MIT
