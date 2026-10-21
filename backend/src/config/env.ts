import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DERIV_WS_URL: z.string().default('wss://ws.deriv.com/websockets/v3'),
  DB_PATH: z.string().default('./data/digit-analyzer.db'),
  DEMO_MODE: z.coerce.boolean().default(true),
  APP_NAME: z.string().default('Digit Analyzer Pro'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  WINDOW_MIN: z.coerce.number().default(50),
  WINDOW_MAX: z.coerce.number().default(500)
});

export const env = envSchema.parse(process.env);
