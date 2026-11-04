import { buildApp } from './app';
import { loadDotEnv, loadEnv } from './config/env';

loadDotEnv();
const env = loadEnv();
const app = await buildApp({ env, logger: { level: env.LOG_LEVEL } });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
