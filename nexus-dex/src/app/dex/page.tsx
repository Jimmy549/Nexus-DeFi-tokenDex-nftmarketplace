// ============================================================
//  app/dex/page.tsx — DEX swap + liquidity page
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout } from '@/components/PageLayout';
import { TokenSelector } from '@/components/TokenSelector';
import { useDEXFactory, usePool, useSwap, useLiquidity, useTokenBalances } from '@/hooks/useDEX';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useReadContract } from 'wagmi';
import { type SupportedToken, CONTRACTS, SUPPORTED_TOKENS } from '@/config/contracts';
import { DEX_FACTORY_ABI, LIQUIDITY_POOL_ABI } from '@/config/abis';
import { formatTokenAmount, parseTokenAmount, calcPriceImpact } from '@/lib/utils';
import { Skeleton } from '@/components/Skeleton';
import {
  ArrowLeftRight, Plus, Minus, ArrowDown, AlertTriangle, RefreshCw, TrendingUp, Info,
} from 'lucide-react';

type Tab = 'swap' | 'add' | 'remove';

export default function DEXPage() {
  const [tab, setTab] = useState<Tab>('swap');

  return (
    <PageLayout
      title="DEX Exchange"
      subtitle="Swap tokens using constant-product AMM · Provide liquidity to earn 0.3% fees"
      accentColor="var(--purple)"
    >
      <div className="max-w-xl mx-auto">

        {/* ── Tab bar ── */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {([['swap', 'Swap', ArrowLeftRight], ['add', 'Add Liquidity', Plus], ['remove', 'Remove Liquidity', Minus]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-display font-600 text-sm uppercase tracking-wider transition-all duration-200"
              style={{
                background: tab === key ? 'rgba(168,85,247,0.15)' : 'transparent',
                border:     tab === key ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
                color:      tab === key ? 'var(--purple)' : 'rgba(255,255,255,0.4)',
              }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'swap'   && <SwapPanel   key="swap"   />}
          {tab === 'add'    && <AddPanel    key="add"    />}
          {tab === 'remove' && <RemovePanel key="remove" />}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

// ─── Swap Panel ───────────────────────────────────────────────
function SwapPanel() {
  const { isConnected } = useAccount();
  const { open }        = useAppKit();
  const balances        = useTokenBalances();

  const [tokenIn,    setTokenIn]    = useState<SupportedToken>(SUPPORTED_TOKENS[0]);
  const [tokenOut,   setTokenOut]   = useState<SupportedToken>(SUPPORTED_TOKENS[1]);
  const [amountIn,   setAmountIn]   = useState('');
  const [step,       setStep]       = useState<'idle' | 'approved'>('idle');

  const { data: poolAddress } = useReadContract({
    address: CONTRACTS.DEX_FACTORY, abi: DEX_FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenIn.address, tokenOut.address],
    query: { enabled: !!tokenIn && !!tokenOut },
  });

  const pool      = usePool(poolAddress as `0x${string}` | undefined);
  const { approveAndSwap, executeSwap, isPending, txSuccess, txType } = useSwap(poolAddress as `0x${string}` | undefined);

  const amountInWei = parseTokenAmount(amountIn);
  const isZeroAddr = poolAddress === '0x0000000000000000000000000000000000000000';
  const noPool     = isZeroAddr || !poolAddress;
  
  const direction   = pool.tokenAAddr?.toLowerCase() === tokenIn.address.toLowerCase() ? 'AtoB' : 'BtoA';

  const { data: preview, refetch: refetchPreview } = useReadContract({
    address:      poolAddress as `0x${string}`,
    abi:          LIQUIDITY_POOL_ABI,
    functionName: direction === 'AtoB' ? 'previewSwap' : 'previewSwapReverse',
    args:         [amountInWei],
    query:        { 
      enabled: !noPool && amountInWei > 0n,
      refetchInterval: 5000 
    },
  });

  const priceImpact = (!noPool && pool.reserves[0] > 0n && amountInWei > 0n)
    ? calcPriceImpact(amountInWei, direction === 'AtoB' ? pool.reserves[0] : pool.reserves[1], direction === 'AtoB' ? pool.reserves[1] : pool.reserves[0])
    : 0;

  const bal = balances[tokenIn.symbol as keyof typeof balances] as bigint ?? 0n;
  const noLiquidity = !noPool && (pool.reserves[0] === 0n || pool.reserves[1] === 0n);

  const flip = () => { setTokenIn(tokenOut); setTokenOut(tokenIn); setAmountIn(''); setStep('idle'); };

  const handleSwap = () => {
    if (!isConnected) { open(); return; }
    if (!poolAddress || amountInWei === 0n) return;

    if (step === 'idle') {
      approveAndSwap(tokenIn.address, amountInWei);
    } else {
      executeSwap(direction, amountInWei);
    }
  };

  useEffect(() => {
    if (txSuccess) { setAmountIn(''); setStep('idle'); }
    else if (txType === 'approve') { setStep('approved'); }
  }, [txSuccess, txType]);

  return (
    <motion.div className="glass-cyan rounded-2xl p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>

      <div className="mb-2">
        <div className="flex justify-between mb-2">
          <span className="stat-label">You pay</span>
          <button
            className="font-mono text-xs transition-opacity hover:opacity-100"
            style={{ color: 'rgba(0,229,255,0.55)' }}
            onClick={() => { setAmountIn(formatTokenAmount(bal, 18, 6)); setStep('idle'); }}
          >
            Balance: {formatTokenAmount(bal, 18, 3)} {tokenIn.symbol}
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amountIn}
            onChange={e => { setAmountIn(e.target.value); setStep('idle'); }}
            placeholder="0.0"
            className="input-cyber pr-32 text-xl font-700"
          />
          <div className="absolute right-0 top-0 h-full flex items-center pr-3">
            <div
              className="px-3 py-1 rounded-lg font-display font-700 text-sm"
              style={{ background: `${tokenIn.color}22`, color: tokenIn.color }}
            >
              {tokenIn.symbol}
            </div>
          </div>
        </div>
      </div>

      <TokenSelector value={tokenIn} onChange={t => { setTokenIn(t); setAmountIn(''); setStep('idle'); }} exclude={[tokenOut.address]} showBalance label="" />

      <div className="flex justify-center my-4">
        <button
          onClick={flip}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)' }}
        >
          <ArrowDown className="w-4 h-4" style={{ color: 'var(--purple)' }} />
        </button>
      </div>

      <div className="mb-4">
        <span className="stat-label block mb-2">You receive</span>
        {isPending ? (
          <Skeleton height="56px" className="rounded-xl" />
        ) : (
          <div className="input-cyber flex items-center justify-between text-xl font-700 cursor-not-allowed" style={{ color: (preview && preview > 0n) ? 'white' : 'rgba(255,255,255,0.25)' }}>
            <span>{preview ? formatTokenAmount(preview as bigint, 18, 6) : '0.0'}</span>
            <div className="flex flex-col items-end">
              <span className="font-display text-sm" style={{ color: tokenOut.color }}>{tokenOut.symbol}</span>
              {noLiquidity && <span className="text-[10px] text-red-400 font-mono">No Liquidity</span>}
            </div>
          </div>
        )}
      </div>

      <TokenSelector value={tokenOut} onChange={t => { setTokenOut(t); setStep('idle'); }} exclude={[tokenIn.address]} label="" />

      {!noPool && amountInWei > 0n && preview && (
        <motion.div className="mt-4 p-3 rounded-lg space-y-2" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-between font-mono text-xs">
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Rate</span>
            <span className="text-white">
              1 {tokenIn.symbol} = {formatTokenAmount(((preview as bigint) * BigInt(10)**BigInt(18)) / amountInWei, 18, 4)} {tokenOut.symbol}
            </span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Fee (0.3%)</span>
            <span className="text-white">{formatTokenAmount(amountInWei * 3n / 1000n, 18, 4)} {tokenIn.symbol}</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Price Impact</span>
            <span style={{ color: priceImpact > 5 ? 'var(--red)' : priceImpact > 2 ? 'var(--amber)' : 'var(--green)' }}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
        </motion.div>
      )}

      {noPool && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg font-mono text-xs" style={{ background: 'rgba(255,77,79,0.08)', border: '1px solid rgba(255,77,79,0.2)', color: 'rgba(255,100,100,0.8)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          No pool exists for this pair.
        </div>
      )}

      <button
        onClick={handleSwap}
        disabled={isPending || noPool || noLiquidity || amountInWei === 0n || bal < amountInWei}
        className="w-full btn-cyan-solid mt-4 py-4 text-base flex items-center justify-center gap-2"
      >
        {isPending ? (
          <><motion.div className="w-5 h-5 border-2 border-navy-800 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> Processing...</>
        ) : (
          <>{step === 'idle' ? <ArrowLeftRight className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />} 
          {!isConnected ? 'Connect Wallet' : step === 'idle' ? '1. Approve Token' : '2. Confirm Swap'}</>
        )}
      </button>
    </motion.div>
  );
}

// ─── Add Liquidity Panel ──────────────────────────────────────
function AddPanel() {
  const { isConnected } = useAccount();
  const { open }        = useAppKit();
  const balances        = useTokenBalances();

  const [tokenA, setTokenA] = useState<SupportedToken>(SUPPORTED_TOKENS[0]);
  const [tokenB, setTokenB] = useState<SupportedToken>(SUPPORTED_TOKENS[1]);
  const [amtA,   setAmtA]   = useState('');
  const [amtB,   setAmtB]   = useState('');
  const [step,   setStep]   = useState<'idle' | 'approvedA' | 'approvedB' | 'ready'>('idle');

  const { data: poolAddress } = useReadContract({
    address: CONTRACTS.DEX_FACTORY, abi: DEX_FACTORY_ABI,
    functionName: 'getPool', args: [tokenA.address, tokenB.address],
    query: { enabled: !!tokenA && !!tokenB },
  });

  const pool       = usePool(poolAddress as `0x${string}` | undefined);
  const { approveToken, addLiquidity, isPending, txType } = useLiquidity(poolAddress as `0x${string}` | undefined);

  const hasLiquidity = pool.reserves[0] > 0n;

  const handleAmtAChange = (val: string) => {
    setAmtA(val);
    setStep('idle');
    if (hasLiquidity && val && pool.reserves[0] > 0n) {
      const aWei = parseTokenAmount(val);
      const bWei = (aWei * pool.reserves[1]) / pool.reserves[0];
      setAmtB(formatTokenAmount(bWei, 18, 6));
    }
  };

  const handleAdd = () => {
    if (!isConnected) { open(); return; }
    const aWei = parseTokenAmount(amtA);
    const bWei = parseTokenAmount(amtB);
    if (aWei === 0n || bWei === 0n) return;

    if (step === 'idle') {
      approveToken(tokenA.address, aWei, true);
    } else if (step === 'approvedA') {
      approveToken(tokenB.address, bWei, false);
    } else {
      addLiquidity(aWei, bWei);
    }
  };

  useEffect(() => {
    if (txType === 'approveA') setStep('approvedA');
    else if (txType === 'approveB') setStep('ready');
    else if (txType === 'add') { setAmtA(''); setAmtB(''); setStep('idle'); }
  }, [txType]);

  const balA = balances[tokenA.symbol as keyof typeof balances] ?? 0n;
  const balB = balances[tokenB.symbol as keyof typeof balances] ?? 0n;

  return (
    <motion.div className="glass-cyan rounded-2xl p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      <div className="flex items-center gap-2 mb-5 p-3 rounded-lg font-mono text-xs" style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', color: 'rgba(0,229,255,0.7)' }}>
        <Info className="w-4 h-4" />
        Multi-step process: Approve Token A, Approve Token B, then Add Liquidity.
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="stat-label">Token A Amount</span>
          <button className="font-mono text-xs" style={{ color: 'rgba(0,229,255,0.55)' }} onClick={() => handleAmtAChange(formatTokenAmount(balA, 18, 6))}>
            Max: {formatTokenAmount(balA, 18, 3)}
          </button>
        </div>
        <input type="number" value={amtA} onChange={e => handleAmtAChange(e.target.value)} placeholder="0.0" className="input-cyber mb-2 text-lg" />
        <TokenSelector value={tokenA} onChange={t => { setTokenA(t); setStep('idle'); }} exclude={[tokenB.address]} showBalance />
      </div>

      <div className="flex justify-center my-3">
        <Plus className="w-5 h-5" style={{ color: 'rgba(0,229,255,0.4)' }} />
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="stat-label">Token B Amount</span>
          <button className="font-mono text-xs" style={{ color: 'rgba(0,229,255,0.55)' }} onClick={() => { setAmtB(formatTokenAmount(balB, 18, 6)); setStep('idle'); }}>
            Max: {formatTokenAmount(balB, 18, 3)}
          </button>
        </div>
        <input
          type="number" value={amtB}
          onChange={e => { setAmtB(e.target.value); setStep('idle'); }}
          placeholder={hasLiquidity ? 'Auto-calculated' : '0.0'}
          className="input-cyber mb-2 text-lg"
          readOnly={hasLiquidity}
          style={{ opacity: hasLiquidity ? 0.7 : 1 }}
        />
        <TokenSelector value={tokenB} onChange={t => { setTokenB(t); setStep('idle'); }} exclude={[tokenA.address]} showBalance />
      </div>

      {hasLiquidity && (
        <div className="mb-4 p-3 rounded-lg space-y-2" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between font-mono text-xs">
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Pool ratio</span>
            <span className="text-white">
              {formatTokenAmount(pool.reserves[0], 18, 2)} / {formatTokenAmount(pool.reserves[1], 18, 2)}
            </span>
          </div>
        </div>
      )}

      <button onClick={handleAdd} disabled={isPending || parseTokenAmount(amtA) === 0n} className="w-full btn-cyan-solid py-4 text-base flex items-center justify-center gap-2">
        {isPending ? (
          <><motion.div className="w-5 h-5 border-2 border-navy-800 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> Processing...</>
        ) : (
          <><Plus className="w-5 h-5" /> 
          {!isConnected ? 'Connect Wallet' : step === 'idle' ? '1. Approve Token A' : step === 'approvedA' ? '2. Approve Token B' : '3. Add Liquidity'}
          </>
        )}
      </button>
    </motion.div>
  );
}

// ─── Remove Liquidity Panel ───────────────────────────────────
function RemovePanel() {
  const { isConnected } = useAccount();
  const { open }        = useAppKit();

  const [tokenA, setTokenA] = useState<SupportedToken>(SUPPORTED_TOKENS[0]);
  const [tokenB, setTokenB] = useState<SupportedToken>(SUPPORTED_TOKENS[1]);
  const [percent, setPercent] = useState(50);

  const { data: poolAddress } = useReadContract({
    address: CONTRACTS.DEX_FACTORY, abi: DEX_FACTORY_ABI,
    functionName: 'getPool', args: [tokenA.address, tokenB.address],
    query: { enabled: !!tokenA && !!tokenB },
  });

  const pool     = usePool(poolAddress as `0x${string}` | undefined);
  const { removeLiquidity, isPending } = useLiquidity(poolAddress as `0x${string}` | undefined);

  const sharesToRemove = pool.userShares > 0n ? (pool.userShares * BigInt(percent)) / 100n : 0n;
  const willGetA = pool.totalShares > 0n ? (sharesToRemove * pool.reserves[0]) / pool.totalShares : 0n;
  const willGetB = pool.totalShares > 0n ? (sharesToRemove * pool.reserves[1]) / pool.totalShares : 0n;

  return (
    <motion.div className="glass-cyan rounded-2xl p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>

      <div className="mb-5">
        <span className="stat-label block mb-3">Select pool</span>
        <div className="grid grid-cols-2 gap-3">
          <TokenSelector value={tokenA} onChange={t => { setTokenA(t); }} exclude={[tokenB.address]} label="Token A" />
          <TokenSelector value={tokenB} onChange={t => { setTokenB(t); }} exclude={[tokenA.address]} label="Token B" />
        </div>
      </div>

      <div className="stat-box mb-5">
        <span className="stat-label">Your LP Shares</span>
        <span className="stat-value">{formatTokenAmount(pool.userShares, 18, 4)}</span>
        <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
          of {formatTokenAmount(pool.totalShares, 18, 4)} total
        </span>
      </div>

      {pool.userShares > 0n ? (
        <>
          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <span className="stat-label">Amount to remove</span>
              <span className="font-mono text-sm font-700" style={{ color: 'var(--cyan)' }}>{percent}%</span>
            </div>
            <input type="range" min={1} max={100} value={percent} onChange={e => setPercent(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(90deg, var(--cyan) ${percent}%, rgba(0,229,255,0.1) ${percent}%)` }}
            />
          </div>

          <div className="p-3 rounded-lg space-y-2 mb-5" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="font-mono text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>You will receive:</div>
            <div className="flex justify-between font-mono text-sm">
              <span style={{ color: tokenA.color }}>{tokenA.symbol}</span>
              <span className="font-600 text-white">{formatTokenAmount(willGetA, 18, 4)}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span style={{ color: tokenB.color }}>{tokenB.symbol}</span>
              <span className="font-600 text-white">{formatTokenAmount(willGetB, 18, 4)}</span>
            </div>
          </div>

          <button
            onClick={() => isConnected ? removeLiquidity(sharesToRemove) : open()}
            disabled={isPending || sharesToRemove === 0n}
            className="w-full btn-purple py-4 text-base flex items-center justify-center gap-2"
          >
            {isPending ? (
              <><motion.div className="w-5 h-5 border-2 border-purple-200 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> Removing...</>
            ) : (
              <><Minus className="w-5 h-5" /> Remove {percent}% Liquidity</>
            )}
          </button>
        </>
      ) : (
        <div className="text-center py-8 font-mono text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
          No LP shares found.
        </div>
      )}
    </motion.div>
  );
}
