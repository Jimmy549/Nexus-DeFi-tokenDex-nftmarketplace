// Contract addresses + token registry
// ============================================================
//  contracts.ts — Central registry of deployed contract addresses.
// ============================================================
export const CONTRACTS = {
  PLATFORM_TOKEN:  process.env.NEXT_PUBLIC_PLATFORM_TOKEN_ADDRESS  as `0x${string}`,
  TOKEN_A:         process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS          as `0x${string}`,
  TOKEN_B:         process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS          as `0x${string}`,
  FAUCET:          process.env.NEXT_PUBLIC_FAUCET_ADDRESS           as `0x${string}`,
  DEX_FACTORY:     process.env.NEXT_PUBLIC_DEX_FACTORY_ADDRESS      as `0x${string}`,
  NFT_COLLECTION:  process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS   as `0x${string}`,
  NFT_MARKETPLACE: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_ADDRESS  as `0x${string}`,
} as const;

export const SUPPORTED_TOKENS = [
  {
    symbol:   'NXS',
    name:     'Nexus Token',
    address:  CONTRACTS.PLATFORM_TOKEN,
    decimals: 18,
    color:    '#00e5ff',
    icon:     '⬡',
  },
  {
    symbol:   'ALPH',
    name:     'Alpha Token',
    address:  CONTRACTS.TOKEN_A,
    decimals: 18,
    color:    '#a855f7',
    icon:     'α',
  },
  {
    symbol:   'BETA',
    name:     'Beta Token',
    address:  CONTRACTS.TOKEN_B,
    decimals: 18,
    color:    '#00ff9d',
    icon:     'β',
  },
];

export type SupportedToken = typeof SUPPORTED_TOKENS[number];
