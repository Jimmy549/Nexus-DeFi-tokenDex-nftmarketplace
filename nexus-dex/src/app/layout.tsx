// Root layout + fonts + wagmi providers
// ============================================================
//  app/layout.tsx — Root layout with wagmi + web3modal providers
// ============================================================
import type { Metadata } from 'next';
import { Exo_2, DM_Mono } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import { NavigationProgress } from '@/components/NavigationProgress';
import './globals.css';

const exo2 = Exo_2({
  subsets:  ['latin'],
  variable: '--font-exo',
  weight:   ['300', '400', '500', '600', '700', '800'],
});

const dmMono = DM_Mono({
  subsets:  ['latin'],
  variable: '--font-dm-mono',
  weight:   ['300', '400', '500'],
});

export const metadata: Metadata = {
  title:       'Nexus DeFi — Multi-Token DEX + NFT Marketplace',
  description: 'Swap tokens, provide liquidity, and trade NFTs with any supported token.',
  keywords:    ['DeFi', 'DEX', 'NFT', 'Ethereum', 'Web3'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${exo2.variable} ${dmMono.variable}`} data-scroll-behavior="smooth">
      <body className="bg-navy-800 text-white antialiased font-body">
        <Providers>
          <NavigationProgress />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background:   '#0d1220',
                color:        '#e2e8f0',
                border:       '1px solid rgba(0,229,255,0.3)',
                borderRadius: '8px',
                fontFamily:   'var(--font-dm-mono)',
                fontSize:     '13px',
              },
              success: { iconTheme: { primary: '#00ff9d', secondary: '#0d1220' } },
              error:   { iconTheme: { primary: '#ff4d4f', secondary: '#0d1220' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
