// =============================================================================
// FLILINK — Production build over HTTPS for testing on a phone (npm run phone)
// =============================================================================
// Runs the built app (fast, pre-compiled pages, no dev live-reload connection
// — so no reload loops) over HTTPS so phone-only features like tap-to-paste
// work. `npm run phone` builds first; rebuild after code changes.
// =============================================================================

import https from 'node:https';
import { createDevCertificate, printPhoneUrls } from './lib/dev-cert.mjs';

process.env.NODE_ENV = 'production';
const { default: next } = await import('next');

const port = parseInt(process.env.PORT || '3000', 10);
const { key, cert, ips } = await createDevCertificate();

const app = next({ dev: false, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();
await app.prepare();

https
  .createServer({ key, cert }, (req, res) => {
    handle(req, res);
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`  Production server ready → https://localhost:${port}`);
    printPhoneUrls(ips, port);
  });
