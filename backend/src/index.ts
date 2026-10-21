import * as dotenv from 'dotenv';
import { createApp } from './api/server.js';
import { env } from './config/env.js';

dotenv.config();

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`${env.APP_NAME} listening on http://localhost:${env.PORT}`);
});
