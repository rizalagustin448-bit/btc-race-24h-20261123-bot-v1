# BTC Race 24h Trading Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node-22-green.svg)](https://nodejs.org/)
[![make.fun](https://img.shields.io/badge/make.fun-bounty-blue.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)

A bot that trades Coinbase Wrapped BTC (cbBTC) on 1-minute on-chain prices with $1,000 of paper money, built for the make.fun "Race a BTC trading bot live for 24 hours" bounty. Simulation only — no real money is traded.

## Strategy

One early unconditional buy, one wide disaster stop, no take-profit — at most 2 fills:

- **Entry:** buy 100% of cash on the second bar it sees. Unconditional: a bot that waits for a dip may never enter on a window that rises in a straight line, and zero trades fails the race guardrail outright.
- **Stop-loss:** sell everything if a close prints more than 5% below the buy's fill price. Wide on purpose — disqualification insurance only (the race guardrail caps drawdown at 25%): in a window that keeps falling it banks the loss near −5% instead of riding it to −10% or worse, and in a window that only chops it never fires (the dev window's worst drawdown from entry is under 2%).
- **No take-profit:** a 24h BTC window can run 5–10%, and the ranking is pure net PnL, so capping the upside at any fixed percent cuts off exactly the tail that decides first place. The position rides to the end and is flattened there by the harness.
- **No re-entry.** Every extra trade pays ~26 bps in fee, slippage and impact, and 1-minute moves above that cost appear only 15 times in the dev window's 1,440 bars.

Why this shape: the dev window is only a gate (net PnL > 0), never the ranking — the race window is unseen, so the design is judged by robustness on windows it has never seen, not by squeezing the dev number. Tested on the dev window plus mirrored, flat, half-window, 2×-crash and 200-window block-bootstrap copies (up- and down-regime): the 5% stop never fires in the dev regime (0 triggers in 200 resampled up-windows) while capping crash losses ~$18–47 better than a 10–12% stop in the down regime.

## Dev window grade

Local harness grade on the frozen 24-hour dev window: **net PnL +$32.33**, 1 trade, max drawdown 1.98%, 0 rejected orders, fees $0.81. Deterministic: 3 grade-local runs produce byte-identical action logs (`dff7f4423511a53d84197b69d06a54c9b894e2c95110484bfa9e7d81d7ab9d80`). All amounts use BigInt; no floats, no clock, no randomness.

## Run

```sh
node main.ts
```

The bot reads one JSON line per minute (a 1-minute bar of cbBTC in dollars from its Orca Whirlpool on Solana) and answers with buy and sell orders. Standard library plus the vendored SDK shim in `vendor/` only — nothing is installed, no network, no wall clock, no files outside the repository.

## License

MIT
