// ============================================================
//  app/providers.tsx — Client-side providers wrapper
// ============================================================
'use client';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { sepolia, mainnet } from '@reown/appkit/networks';

// ── Configuration ─────────────────────────────────────────────
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
const networks = [sepolia];

// ── Wagmi Adapter (This creates the correct config for AppKit) ──
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
});

// ── QueryClient ───────────────────────────────────────────────
const queryClient = new QueryClient();

// ── Initialize AppKit ─────────────────────────────────────────
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Nexus DeFi',
    description: 'Multi-token DEX + NFT Marketplace',
    url: 'https://nexus.dex',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
  },
  themeMode: 'dark',
  features: { analytics: false }
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}