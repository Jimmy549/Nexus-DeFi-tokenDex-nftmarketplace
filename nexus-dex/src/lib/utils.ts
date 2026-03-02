// Shared formatting + math helpers
// ============================================================
//  lib/utils.ts — Shared utility functions
// ============================================================
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format a bigint token amount (18 decimals) to a readable string.
 * e.g. 1000000000000000000n → "1.0000"
 */
export function formatTokenAmount(
  amount: bigint,
  decimals = 18,
  displayDecimals = 4
): string {
  if (amount === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const whole   = amount / divisor;
  const frac    = amount % divisor;

  const fracStr = frac.toString().padStart(decimals, '0').slice(0, displayDecimals);
  const trimmed = fracStr.replace(/0+$/, '') || '0';

  return `${whole.toLocaleString()}.${trimmed}`;
}

/**
 * Parse a human-readable token string to bigint wei.
 * e.g. "1.5" → 1500000000000000000n
 */
export function parseTokenAmount(amount: string, decimals = 18): bigint {
  if (!amount || amount === '.') return 0n;
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(whole || '0') * BigInt(10 ** decimals) + BigInt(fracPadded || '0');
}

/**
 * Shorten an Ethereum address for display.
 * e.g. "0x1234...5678"
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format seconds into a human-readable countdown string.
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Ready';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Calculate price impact for a swap (percentage).
 */
export function calcPriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  if (reserveIn === 0n || reserveOut === 0n) return 0;
  const newReserveIn  = reserveIn + amountIn;
  const oldPrice      = Number(reserveOut * 10000n / reserveIn);
  const newPrice      = Number(reserveOut * 10000n / newReserveIn);
  return Math.abs((oldPrice - newPrice) / oldPrice) * 100;
}

/**
 * Convert IPFS URI to HTTP gateway URL.
 */
export function ipfsToHttp(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format a USD-like value from a token amount and price.
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}
