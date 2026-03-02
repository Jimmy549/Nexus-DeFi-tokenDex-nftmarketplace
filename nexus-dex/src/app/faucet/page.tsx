// ============================================================
//  app/faucet/page.tsx — Token faucet page
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout } from '@/components/PageLayout';
import { useFaucet } from '@/hooks/useFaucet';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatTokenAmount, formatCountdown } from '@/lib/utils';
import { Droplets, Clock, Zap, ExternalLink, TrendingUp, Users } from 'lucide-react';
import { CONTRACTS } from '@/config/contracts';

export default function FaucetPage() {
  const { isConnected } = useAccount();
  const { open }        = useAppKit();
  const {
    canClaim, cooldownSeconds, totalClaimed,
    globalTotal, claimAmount, cooldownPeriod, faucetTokenAddr, usesMint, claim, isClaiming, isConfirmed, txHash,
  } = useFaucet();

  const isWrongToken = faucetTokenAddr && faucetTokenAddr.toLowerCase() !== CONTRACTS.PLATFORM_TOKEN.toLowerCase();

  const [countdown, setCountdown] = useState(cooldownSeconds);

  // Live countdown timer
  useEffect(() => {
    setCountdown(cooldownSeconds);
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  const progressPercent = countdown > 0 ? ((86400 - countdown) / 86400) * 100 : 100;

  return (
    <PageLayout
      title="Token Faucet"
      subtitle={`Claim ${formatTokenAmount(claimAmount, 18, 0)} NXS free every ${Math.floor(cooldownPeriod / 3600)} hours · No wallet required to browse`}
    >
      <div className="max-w-2xl mx-auto">
        {/* Diagnostic Warnings */}
        {isWrongToken && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs">
            <p className="font-bold mb-1">⚠️ CONFIGURATION ERROR</p>
            <p>Faucet is pointing to the wrong token address. Transactions will fail.</p>
            <p className="mt-2 text-[10px] opacity-70">Contract: {faucetTokenAddr} <br/> Expected: {CONTRACTS.PLATFORM_TOKEN}</p>
          </div>
        )}

        {usesMint === false && globalTotal === 0n && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs">
            <p className="font-bold mb-1">⚠️ FAUCET EMPTY</p>
            <p>This faucet requires manual funding and is currently empty. Transactions will fail.</p>
          </div>
        )}

        {usesMint === true && (
          <div className="mb-4 text-[10px] font-mono text-white/20 text-center uppercase tracking-widest">
            Protocol uses direct minting · Faucet must be Minter
          </div>
        )}

        {/* ── Main faucet card ── */}
        <motion.div
          className="glass-cyan rounded-2xl p-8 mb-6"
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Animated icon */}
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,229,255,0.08)', border: '2px solid rgba(0,229,255,0.25)' }}
              animate={canClaim && isConnected ? { boxShadow: ['0 0 10px rgba(0,229,255,0.2)', '0 0 40px rgba(0,229,255,0.5)', '0 0 10px rgba(0,229,255,0.2)'] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Droplets
                className="w-14 h-14"
                style={{ color: canClaim && isConnected ? 'var(--cyan)' : 'rgba(0,229,255,0.3)' }}
              />
              {canClaim && isConnected && (
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--green)' }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <span className="text-[8px] font-bold text-black">✓</span>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Amount display */}
          <div className="text-center mb-8">
            <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(0,229,255,0.6)' }}>
              Claim Amount
            </div>
            <div className="font-display font-800 text-6xl text-white mb-1">
              {formatTokenAmount(claimAmount, 18, 0)}
            </div>
            <div className="font-mono text-lg" style={{ color: 'var(--cyan)' }}>NXS</div>
          </div>

          {/* Cooldown progress */}
          {isConnected && !canClaim && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: 'rgba(255,179,0,0.7)' }} />
                  <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Next claim in</span>
                </div>
                <span className="font-mono text-sm font-600" style={{ color: 'var(--amber)' }}>
                  {formatCountdown(countdown)}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, rgba(0,229,255,0.7), var(--cyan))' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>0h</span>
                <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>24h</span>
              </div>
            </div>
          )}

          {/* Claim button */}
          {isConnected ? (
            <button
              onClick={claim}
              disabled={!canClaim || isClaiming}
              className="w-full btn-cyan-solid flex items-center justify-center gap-3 text-base py-4"
            >
              {isClaiming ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-navy-800 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Claiming...
                </>
              ) : canClaim ? (
                <>
                  <Zap className="w-5 h-5" />
                  Claim {formatTokenAmount(claimAmount, 18, 0)} NXS
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  Cooldown Active
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => open()}
              className="w-full btn-cyan flex items-center justify-center gap-3 text-base py-4"
            >
              <Droplets className="w-5 h-5" />
              Connect Wallet to Claim
            </button>
          )}

          {/* TX link */}
          <AnimatePresence>
            {isConfirmed && txHash && (
              <motion.div
                className="mt-4 flex items-center justify-center gap-2 font-mono text-xs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span style={{ color: 'var(--green)' }}>✓ Claimed successfully</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                  style={{ color: 'rgba(0,229,255,0.6)' }}
                >
                  View tx <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-box text-center">
            <span className="stat-label block mb-1">Your Claimed</span>
            <span className="font-mono font-700 text-lg text-white">
              {formatTokenAmount(totalClaimed, 18, 0)}
            </span>
            <span className="font-mono text-xs" style={{ color: 'rgba(0,229,255,0.5)' }}>NXS</span>
          </div>
          <div className="stat-box text-center">
            <span className="stat-label block mb-1">Claim Size</span>
            <span className="font-mono font-700 text-lg text-white">
              {formatTokenAmount(claimAmount, 18, 0)}
            </span>
            <span className="font-mono text-xs" style={{ color: 'rgba(0,229,255,0.5)' }}>NXS</span>
          </div>
          <div className="stat-box text-center">
            <span className="stat-label block mb-1">Cooldown</span>
            <span className="font-mono font-700 text-lg text-white">{Math.floor(cooldownPeriod / 3600)}</span>
            <span className="font-mono text-xs" style={{ color: 'rgba(0,229,255,0.5)' }}>hours</span>
          </div>
        </div>

        {/* ── Global stats ── */}
        <div className="glass-cyan rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--cyan)' }} />
            <span className="font-display font-600 text-sm text-white">Faucet Statistics</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="stat-label block mb-1">Total Distributed</span>
              <span className="font-mono text-sm font-600 text-white">
                {formatTokenAmount(globalTotal, 18, 0)} NXS
              </span>
            </div>
            <div>
              <span className="stat-label block mb-1">Per Day (theoretical)</span>
              <span className="font-mono text-sm font-600 text-white">
                Unlimited
              </span>
            </div>
          </div>
        </div>

        {/* ── Info box ── */}
        <div className="mt-4 p-4 rounded-xl font-mono text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
          <strong className="text-white">How it works:</strong> The faucet calls the PlatformToken mint function directly.
          Tokens are sent to your wallet in one transaction. Each address has a 24-hour cooldown tracked on-chain.
          Use NXS to swap on the DEX or purchase NFTs on the marketplace.
        </div>
      </div>
    </PageLayout>
  );
}
