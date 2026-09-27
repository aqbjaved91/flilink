// =============================================================================
// FLILINK — Local HTTPS certificate for phone testing
// =============================================================================
// Phones reach the PC by its Wi-Fi IP. Over plain http:// the browser blocks
// secure-only features such as tap-to-paste, so we serve HTTPS with a
// self-signed certificate for localhost + this PC's network IPs. Nothing is
// installed into the system trust store: the phone shows a one-time
// "connection is not private" page — tap Advanced → Proceed.
// =============================================================================

import fs from 'node:fs';
import os from 'node:os';
import selfsigned from 'selfsigned';

// Relative paths: project folders often contain spaces
const CERT_DIR = 'certificates';

export function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

export async function createDevCertificate() {
  const ips = lanAddresses();
  const notAfter = new Date();
  notAfter.setFullYear(notAfter.getFullYear() + 1);

  const pems = await selfsigned.generate([{ name: 'commonName', value: 'Flilink dev' }], {
    keySize: 2048,
    algorithm: 'sha256',
    notAfterDate: notAfter,
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
      { name: 'extKeyUsage', serverAuth: true },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          ...ips.map((ip) => ({ type: 7, ip })),
        ],
      },
    ],
  });

  fs.mkdirSync(CERT_DIR, { recursive: true });
  const keyFile = `${CERT_DIR}/dev-key.pem`;
  const certFile = `${CERT_DIR}/dev-cert.pem`;
  fs.writeFileSync(keyFile, pems.private);
  fs.writeFileSync(certFile, pems.cert);
  return { keyFile, certFile, key: pems.private, cert: pems.cert, ips };
}

export function printPhoneUrls(ips, port) {
  console.log('\n  Open on your phone (same Wi-Fi):');
  for (const ip of ips) console.log(`    https://${ip}:${port}`);
  console.log('  First visit shows a certificate warning — tap Advanced → Proceed.\n');
}
