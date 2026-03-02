// Landing page / home
// ============================================================
//  app/page.tsx — Landing page / dashboard
// ============================================================
'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/Navbar';
import { ArrowRight, Droplets, ArrowLeftRight, Image, LayoutGrid, Zap, Shield, Layers } from 'lucide-react';

const MotionDiv = dynamic(() => import('framer-motion').then(mod => mod.motion.div), { ssr: false });

const FEATURES = [
  {
    icon:     Droplets,
    title:    'Token Faucet',
    desc:     'Claim 100 NXS free every 24 hours to start trading immediately.',
    href:     '/faucet',
    color:    'var(--cyan)',
    gradient: 'from-cyan-500/10 to-transparent',
  },
  {
    icon:     ArrowLeftRight,
    title:    'Decentralized DEX',
    desc:     'Swap tokens and provide liquidity using constant-product AMM pools.',
    href:     '/dex',
    color:    'var(--purple)',
    gradient: 'from-purple-500/10 to-transparent',
  },
  {
    icon:     Image,
    title:    'NFT Marketplace',
    desc:     'Buy Nexus Genesis NFTs using any supported token via automatic DEX swaps.',
    href:     '/marketplace',
    color:    'var(--green)',
    gradient: 'from-green-500/10 to-transparent',
  },
  {
    icon:     LayoutGrid,
    title:    'Portfolio',
    desc:     'Track your token balances, LP positions, and owned NFTs in one place.',
    href:     '/portfolio',
    color:    'var(--amber)',
    gradient: 'from-amber-500/10 to-transparent',
  },
];

const STATS = [
  { label: 'Supported Tokens',  value: '3',       suffix: '' },
  { label: 'AMM Pools',         value: '3',        suffix: '' },
  { label: 'NFT Collection',    value: '10K',      suffix: ' max' },
  { label: 'Swap Fee',          value: '0.3',      suffix: '%' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-20">

        {/* ── Hero ── */}
        <section className="py-20 lg:py-28 text-center relative">
          {/* Glow backdrop */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, rgba(0,229,255,0.08) 0%, transparent 60%)',
            }}
          />

          <MotionDiv
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 font-mono text-xs" style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: 'var(--cyan)' }}>
              <Zap className="w-3 h-3" />
              Fully on-chain · No backend · Sepolia Testnet
            </div>

            <h1 className="font-display font-800 text-5xl lg:text-7xl tracking-tight mb-6 leading-none">
              <span style={{ color: 'white' }}>The </span>
              <span style={{ color: 'var(--cyan)', textShadow: '0 0 40px rgba(0,229,255,0.4)' }}>Nexus</span>
              <br />
              <span style={{ color: 'white' }}>DeFi Ecosystem</span>
            </h1>

            <p className="font-mono text-base lg:text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Swap tokens, provide liquidity, and trade NFTs — all powered by
              transparent on-chain smart contracts with zero intermediaries.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/dex" className="btn-cyan-solid flex items-center gap-2 text-base px-8 py-4">
                Launch DEX <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/marketplace" className="btn-cyan flex items-center gap-2 text-base px-8 py-4">
                Browse NFTs <Image className="w-4 h-4" />
              </Link>
            </div>
          </MotionDiv>
        </section>

        {/* ── Stats bar ── */}
        <MotionDiv
          className="glass-cyan rounded-2xl p-6 mb-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display font-800 text-3xl text-white mb-1">
                {stat.value}<span className="text-xl" style={{ color: 'var(--cyan)' }}>{stat.suffix}</span>
              </div>
              <div className="font-mono text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </MotionDiv>

        {/* ── Feature cards ── */}
        <section className="grid md:grid-cols-2 gap-6 mb-20">
          {FEATURES.map((f, i) => (
            <MotionDiv
              key={f.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
            >
              <Link href={f.href}>
                <div
                  className="glass-cyan rounded-2xl p-8 h-full group cursor-pointer transition-all duration-300 hover:scale-[1.01]"
                  style={{ '--card-color': f.color } as React.CSSProperties}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
                    style={{ background: `${f.color}18`, border: `1px solid ${f.color}35` }}
                  >
                    <f.icon className="w-7 h-7 transition-all duration-300 group-hover:scale-110" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-display font-700 text-xl text-white mb-3">{f.title}</h3>
                  <p className="font-mono text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {f.desc}
                  </p>
                  <div className="flex items-center gap-2 font-mono text-xs font-500" style={{ color: f.color }}>
                    Open app <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </MotionDiv>
          ))}
        </section>

        {/* ── Architecture highlight ── */}
        <section className="glass-cyan rounded-2xl p-8 mb-20">
          <h2 className="font-display font-700 text-2xl text-white mb-6 flex items-center gap-3">
            <Layers className="w-6 h-6" style={{ color: 'var(--cyan)' }} />
            Built on Solid Foundations
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'OpenZeppelin Contracts', desc: 'Battle-tested ERC-20, ERC-721 standards with ReentrancyGuard and access control.' },
              { icon: Zap,    title: 'Constant-Product AMM',  desc: 'x × y = k formula with 0.3% swap fee. Permissionless pool creation via Factory pattern.' },
              { icon: Layers, title: 'DEX-Integrated NFTs',  desc: 'Buy NFTs with any token — the marketplace auto-swaps via DEX pools in a single transaction.' },
            ].map((item, i) => (
              <div key={i} className="stat-box">
                <div className="flex items-center gap-2 mb-3">
                  <item.icon className="w-4 h-4" style={{ color: 'var(--cyan)' }} />
                  <span className="font-display font-600 text-sm text-white">{item.title}</span>
                </div>
                <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
