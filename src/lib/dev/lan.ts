import { networkInterfaces } from 'node:os';

/**
 * This machine's addresses on the local network (IPv4, not loopback), for trying a page on a phone in
 * the same Wi-Fi while `next dev` runs. Used only in development: by next.config's `allowedDevOrigins`
 * and by the day-one test's QR code, which must not point a phone at „localhost".
 */
export function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net): net is NonNullable<typeof net> => !!net && net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
}
