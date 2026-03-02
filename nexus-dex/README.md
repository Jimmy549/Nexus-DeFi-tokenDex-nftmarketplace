# Nexus DeFi — Multi-Token DEX + NFT Marketplace

A fully on-chain DeFi ecosystem built with Next.js 14, Wagmi v2, and Web3Modal. Features token swapping, liquidity provision, and NFT marketplace with automatic DEX integration.

## Features

- **Token Faucet**: Claim 100 NXS tokens every 24 hours
- **DEX**: Swap tokens and provide liquidity using constant-product AMM
- **NFT Marketplace**: Buy NFTs with any supported token via automatic swaps
- **Portfolio**: Track balances, LP positions, and owned NFTs

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Wagmi v2 + Web3Modal
- Tailwind CSS
- Framer Motion
- Viem

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your contract addresses and WalletConnect Project ID.

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Get from [WalletConnect Cloud](https://cloud.walletconnect.com)
- `NEXT_PUBLIC_PLATFORM_TOKEN_ADDRESS` - NexusToken (NXS) contract address
- `NEXT_PUBLIC_TOKEN_A_ADDRESS` - AlphaToken contract address
- `NEXT_PUBLIC_TOKEN_B_ADDRESS` - BetaToken contract address
- `NEXT_PUBLIC_FAUCET_ADDRESS` - Faucet contract address
- `NEXT_PUBLIC_DEX_FACTORY_ADDRESS` - DEX Factory contract address
- `NEXT_PUBLIC_NFT_COLLECTION_ADDRESS` - NFT Collection contract address
- `NEXT_PUBLIC_NFT_MARKETPLACE_ADDRESS` - NFT Marketplace contract address
- `NEXT_PUBLIC_CHAIN_ID` - Target chain ID (11155111 for Sepolia)

## Project Structure

```
src/
├── app/              # Next.js pages
├── components/       # React components
├── config/           # Contract addresses & ABIs
├── hooks/            # Custom React hooks
└── lib/              # Utility functions
```

## License

MIT
