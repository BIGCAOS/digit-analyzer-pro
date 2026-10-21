# digit-analyzer-pro
Digit Analyzer Pro is a real-time digit probability analyzer for synthetic index markets from Deriv.

## Overview
- Connects to the public Deriv WebSocket interface.
- Lists active synthetic market symbols via `active_symbols`.
- Loads historical ticks via `ticks_history`.
- Subscribes to new ticks with `ticks`.
- Normalizes the last decimal digit using precision-aware logic.
- Runs probability models and chronological backtesting.
- Exposes a dashboard via a Vite + React frontend and a Node/Express backend.

## Public API used
This project uses official Deriv market data endpoints documented by the provider:
- `active_symbols`
- `ticks_history`
- `ticks`

No credentials are required for public market data access. The project does not submit or store tokens.

## Install

### 1) Prerequisites
- Node.js 20+
- npm 10+

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment
Copy `.env.example` to `.env` and adjust values as necessary.

```bash
cp .env.example .env
```

### 4) Start the app in development mode
```bash
npm run dev
```

This launches the backend on port 4000 and the frontend on port 5173.

## Production build
```bash
npm run build
```

## Test suite
```bash
npm run test
```

## Notes
- If Deriv is unavailable, the app switches to a clear `demo` state and marks the data as simulated.
- The dashboard never claims deterministic prediction of random market behavior; it shows estimated probabilities, uncertainty, and historical results.
- Backtesting is chronological and uses only past observations to predict future outcomes.
