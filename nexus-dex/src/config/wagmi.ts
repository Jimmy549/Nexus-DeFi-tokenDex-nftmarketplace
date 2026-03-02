// ============================================================
//  wagmi.ts — Wagmi v2 configuration
// ============================================================
import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const chains = [sepolia, mainnet] as const;

// Wagmi config — used by WagmiProvider in providers.tsx.
// The AppKit adapter (WagmiAdapter) creates its own config internally;
// this config is only for the WagmiProvider wrapper.
export const config = createConfig({
  chains,
  transports: {
    [sepolia.id]: http('https://rpc.ankr.com/eth_sepolia', {
      batch:      { batchSize: 1024, wait: 16 },
      retryCount: 2,
      retryDelay: 150,
    }),
    [mainnet.id]: http('https://rpc.ankr.com/eth', {
      batch:      { batchSize: 1024, wait: 16 },
      retryCount: 2,
      retryDelay: 150,
    }),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export type AppChains = typeof chains;
