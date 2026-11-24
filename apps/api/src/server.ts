import { buildApp } from './app.js';
import { db } from './db/client.js';

const app = buildApp({ db });
const port = Number(process.env.PORT ?? 3000);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  console.error(err);
  process.exit(1);
});
