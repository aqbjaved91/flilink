// =============================================================================
// FLILINK — HTTPS *dev* server for the phone (npm run dev:phone)
// =============================================================================
// Live code reloading over HTTPS. Note: many phone browsers (iPhone Safari in
// particular) refuse the live-reload connection with a self-signed
// certificate, and Next.js then reloads the page every ~40s. For testing the
// app itself on a phone use `npm run phone` (production build) instead.
// =============================================================================

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createDevCertificate, printPhoneUrls } from './lib/dev-cert.mjs';

const port = process.env.PORT || '3000';
const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const { keyFile, certFile, ips } = await createDevCertificate();

printPhoneUrls(ips, port);

const child = spawn(
  process.execPath,
  [
    nextBin,
    'dev',
    '--experimental-https',
    '--experimental-https-key',
    keyFile,
    '--experimental-https-cert',
    certFile,
    '--port',
    port,
  ],
  { stdio: 'inherit' }
);
child.on('exit', (code) => process.exit(code ?? 0));
// Stopping this script must also stop the dev server it started
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => child.kill(signal));
}
