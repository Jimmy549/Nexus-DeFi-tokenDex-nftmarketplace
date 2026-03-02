// Navigation + wallet button
// ============================================================
//  components/Navbar.tsx — Top navigation bar
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { shortenAddress } from '@/lib/utils';
import { useTokenBalances } from '@/hooks/useDEX';
import { formatTokenAmount } from '@/lib/utils';
import {
  Droplets, ArrowLeftRight, Image, LayoutGrid, Wallet, ChevronDown, Hexagon
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/faucet',      label: 'Faucet',      icon: Droplets      },
  { href: '/dex',         label: 'DEX',          icon: ArrowLeftRight },
  { href: '/marketplace', label: 'Marketplace',  icon: Image         },
  { href: '/portfolio',   label: 'Portfolio',    icon: LayoutGrid    },
];

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { open } = useAppKit();
  const balances = useTokenBalances();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{
        background:  'rgba(6,9,20,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,229,255,0.12)',
      }}
    >
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 lg:px-8">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Hexagon className="w-8 h-8 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" style={{ color: 'var(--cyan)', fill: 'rgba(0,229,255,0.15)' }} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold" style={{ color: 'var(--cyan)' }}>N</span>
          </div>
          <span className="font-display font-800 text-lg tracking-wider" style={{ color: 'white' }}>
            NEXUS<span style={{ color: 'var(--cyan)' }}>.DEX</span>
          </span>
        </Link>

        {/* ── Nav links (desktop) ── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-display font-500 text-sm tracking-wider uppercase transition-all duration-200"
                style={{
                  color:      active ? 'var(--cyan)' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(0,229,255,0.08)' : 'transparent',
                  border:     active ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
                {active && (
                  <span className="w-1 h-1 rounded-full bg-[var(--cyan)] animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Wallet section ── */}
        <div className="flex items-center gap-3">
          {mounted && isConnected && (
            <div className="hidden lg:flex items-center gap-3">
              {/* NXS balance */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs"
                style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}
              >
                <span style={{ color: 'rgba(0,229,255,0.6)' }}>NXS</span>
                <span className="font-600 text-white">
                  {formatTokenAmount(balances.NXS, 18, 2)}
                </span>
              </div>
              {/* Chain indicator */}
              {chain && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs"
                  style={{ background: 'rgba(0,255,157,0.06)', border: '1px solid rgba(0,255,157,0.15)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                  <span style={{ color: 'var(--green)' }}>{chain.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Connect / Account button */}
          <button
            onClick={() => open()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-display font-600 text-sm tracking-wider uppercase transition-all duration-200"
            style={{
              background: mounted && isConnected ? 'rgba(0,229,255,0.08)' : 'rgba(0,229,255,0.12)',
              border:     '1px solid rgba(0,229,255,0.35)',
              color:      'var(--cyan)',
            }}
          >
            <Wallet className="w-4 h-4" />
            {mounted && isConnected && address
              ? shortenAddress(address)
              : 'Connect'
            }
            {mounted && isConnected && <ChevronDown className="w-3 h-3 opacity-60" />}
          </button>
        </div>
      </div>

      {/* ── Mobile nav ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2 px-4"
        style={{ background: 'rgba(6,9,20,0.95)', borderTop: '1px solid rgba(0,229,255,0.12)' }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} prefetch className="flex flex-col items-center gap-1 py-1 px-3">
              <Icon className="w-5 h-5" style={{ color: active ? 'var(--cyan)' : 'rgba(255,255,255,0.4)' }} />
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: active ? 'var(--cyan)' : 'rgba(255,255,255,0.4)' }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
