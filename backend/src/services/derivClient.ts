import { WebSocket } from 'ws';
import { z } from 'zod';
import { env } from '../config/env.js';
import type { PricePrecision, Tick } from '../types.js';
import { extractLastDigit } from './tickNormalizer.js';

const symbolSchema = z.object({
  symbol: z.string(),
  display_name: z.string().optional(),
  pip: z.number().optional(),
  exchange_name: z.string().optional(),
  market: z.string().optional(),
  submarket: z.string().optional(),
  quoted_currency: z.string().optional(),
  contract_type: z.string().optional(),
  is_trading_suspended: z.boolean().optional()
});

const tickPayloadSchema = z.object({
  epoch: z.number().optional(),
  quote: z.number().optional(),
  id: z.union([z.number(), z.string()]).optional(),
  symbol: z.string().optional(),
  tick: z.object({
    quote: z.number().optional(),
    bid: z.number().optional(),
    ask: z.number().optional(),
    epoch: z.number().optional()
  }).passthrough().optional()
});

export class DerivMarketService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectDelayMs = 1000;
  private subscription: string | null = null;

  public status: 'disconnected' | 'connecting' | 'connected' | 'demo' = 'disconnected';

  async connect(): Promise<void> {
    if (this.socket && this.isConnected) {
      return;
    }

    this.status = 'connecting';
    this.socket = new WebSocket(env.DERIV_WS_URL);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Deriv WebSocket timeout')), 15000);

      this.socket?.addEventListener('open', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.status = 'connected';
        resolve();
      });

      this.socket?.addEventListener('error', (event) => {
        clearTimeout(timeout);
        this.status = 'disconnected';
        this.isConnected = false;
        reject(new Error(`Deriv WebSocket error: ${String(event)}`));
      });
    }).catch(() => {
      this.status = env.DEMO_MODE ? 'demo' : 'disconnected';
      this.isConnected = false;
    });
  }

  async getActiveSymbols(): Promise<PricePrecision[]> {
    if (env.DEMO_MODE) {
      return [
        { symbol: 'R_100', displayName: 'Volatility 100 Index', pip: 0.01, decimals: 2 },
        { symbol: 'R_50', displayName: 'Volatility 50 Index', pip: 0.01, decimals: 2 },
        { symbol: 'R_200', displayName: 'Volatility 200 Index', pip: 0.01, decimals: 2 }
      ];
    }

    await this.connect();
    if (!this.isConnected || !this.socket) {
      throw new Error('Deriv connection unavailable');
    }

    const response = await this.sendMessage({ active_symbols: 'brief' });
    const list = Array.isArray(response.active_symbols) ? response.active_symbols : [];

    return list
      .filter((row) => typeof row?.symbol === 'string')
      .map((row) => {
        const parsed = symbolSchema.safeParse(row);
        if (!parsed.success) {
          return null;
        }

        return {
          symbol: parsed.data.symbol,
          displayName: parsed.data.display_name ?? parsed.data.symbol,
          pip: parsed.data.pip ?? 0.01,
          decimals: Math.max(0, Number(parsed.data.pip ? Math.round(Math.abs(Math.log10(parsed.data.pip))) : 2))
        } satisfies PricePrecision;
      })
      .filter(Boolean) as PricePrecision[];
  }

  async fetchInitialTicks(symbol: string, count = 200): Promise<Tick[]> {
    if (env.DEMO_MODE) {
      return this.buildDemoHistory(symbol, count);
    }

    await this.connect();
    if (!this.isConnected || !this.socket) {
      throw new Error('Deriv connection unavailable');
    }

    const response = await this.sendMessage({
      ticks_history: symbol,
      count,
      end: 'latest',
      style: 'ticks'
    });

    const entries = Array.isArray(response.history) ? response.history : Array.isArray(response.ticks) ? response.ticks : [];
    return entries.map((entry, index) => this.toTick(entry, symbol, 'history', index));
  }

  async subscribeToTicks(symbol: string): Promise<Tick[]> {
    this.subscription = symbol;
    if (env.DEMO_MODE) {
      return this.buildDemoHistory(symbol, 120);
    }

    await this.connect();
    if (!this.isConnected || !this.socket) {
      return [];
    }

    this.socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    return this.fetchInitialTicks(symbol, 120);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
    this.isConnected = false;
    this.status = 'disconnected';
  }

  private buildDemoHistory(symbol: string, count: number): Tick[] {
    const now = Date.now();
    const output: Tick[] = [];
    let current = 100 + (symbol.includes('50') ? 50 : symbol.includes('200') ? 200 : 100);

    for (let index = 0; index < count; index += 1) {
      const drift = Math.sin(index / 8) * 0.9 + (index % 7) * 0.12;
      current += (Math.random() - 0.5) * 0.8 + drift;
      const price = Number(current.toFixed(2));
      const digit = extractLastDigit(price, 0.01);
      output.push({
        id: `${symbol}-${index}`,
        symbol,
        epochMs: now - (count - index) * 1000,
        bid: price - 0.01,
        ask: price + 0.01,
        last: price,
        price,
        digit,
        source: 'demo',
        raw: String(price)
      });
    }

    return output;
  }

  private toTick(entry: unknown, symbol: string, source: Tick['source'], index: number): Tick {
    const parsed = tickPayloadSchema.safeParse(entry);
    if (!parsed.success) {
      return {
        id: `${symbol}-${index}`,
        symbol,
        epochMs: Date.now(),
        bid: 0,
        ask: 0,
        last: 0,
        price: 0,
        digit: 0,
        source,
        raw: String(entry)
      };
    }

    const quote = parsed.data.tick?.quote ?? parsed.data.quote ?? 0;
    const epoch = parsed.data.tick?.epoch ?? parsed.data.epoch ?? Date.now();
    const bid = parsed.data.tick?.bid ?? quote - 0.01;
    const ask = parsed.data.tick?.ask ?? quote + 0.01;
    const price = Number(quote);
    const digit = extractLastDigit(price, 0.01);

    return {
      id: `${symbol}-${epoch}-${index}`,
      symbol,
      epochMs: Number(epoch),
      bid,
      ask,
      last: price,
      price,
      digit,
      source,
      raw: String(quote)
    };
  }

  private sendMessage(message: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket is not connected'));
        return;
      }

      const handler = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(String(event.data));
          if (payload.error) {
            reject(new Error(payload.error.message || 'Deriv request failed'));
            return;
          }
          resolve(payload);
        } catch (error) {
          reject(error);
        } finally {
          this.socket?.removeEventListener('message', handler);
        }
      };

      this.socket.addEventListener('message', handler);
      this.socket.send(JSON.stringify(message));
    });
  }
}
