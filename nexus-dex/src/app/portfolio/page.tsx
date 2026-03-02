// ============================================================
//  app/portfolio/page.tsx — User portfolio dashboard
// ============================================================
'use client';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/PageLayout';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useTokenBalances, useDEXFactory, usePool } from '@/hooks/useDEX';
import { useUserNFTs, useBurnNFT } from '@/hooks/useNFTMarketplace';
import { SUPPORTED_TOKENS, CONTRACTS } from '@/config/contracts';
import { NFT_COLLECTION_ABI } from '@/config/abis';
import { useReadContract, usePublicClient } from 'wagmi';
import { formatTokenAmount, shortenAddress, ipfsToHttp } from '@/lib/utils';
import { Wallet, LayoutGrid, Droplets, ExternalLink, Copy, Box, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ListRowSkeleton, Skeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';

export default function PortfolioPage() {
  const { isConnected, address, chain } = useAccount();
  const { open } = useAppKit();

  if (!isConnected || !address) {
    return (
      <PageLayout title="Portfolio" subtitle="View your balances, LP positions, and NFTs" accentColor="var(--amber)">
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,179,0,0.08)', border: '1px solid rgba(255,179,0,0.2)' }}>
            <Wallet className="w-10 h-10" style={{ color: 'rgba(255,179,0,0.5)' }} />
          </div>
          <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect your wallet to view your portfolio.</p>
          <button onClick={() => open()} className="btn-cyan px-8 py-3">Connect Wallet</button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Portfolio" subtitle={`Dashboard for ${shortenAddress(address)}`} accentColor="var(--amber)">
      <div className="space-y-6">
        <WalletHeader address={address} chain={chain} />
        <div className="grid lg:grid-cols-2 gap-6">
          <TokenBalances />
          <LPPositions />
        </div>
        <NFTHoldings address={address} />
      </div>
    </PageLayout>
  );
}

function WalletHeader({ address, chain }: { address: string; chain: any }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.div className="glass-cyan rounded-2xl p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-800 text-2xl" style={{ background: 'rgba(0,229,255,0.1)', border: '2px solid rgba(0,229,255,0.3)', color: 'var(--cyan)' }}>
            {address.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <div className="font-mono text-base font-500 text-white mb-1">{shortenAddress(address, 6)}</div>
            {chain && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
                <span className="font-mono text-xs" style={{ color: 'var(--green)' }}>{chain.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="btn-cyan flex items-center gap-2 py-2 text-xs">
            <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer" className="btn-cyan flex items-center gap-2 py-2 text-xs">
            <ExternalLink className="w-3 h-3" /> Explorer
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function TokenBalances() {
  const balances = useTokenBalances();

  return (
    <motion.div className="glass-cyan rounded-2xl p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <h2 className="font-display font-700 text-base text-white mb-5 flex items-center gap-2">
        <Wallet className="w-4 h-4" style={{ color: 'var(--amber)' }} />
        Assets
      </h2>
      <div className="space-y-3">
        {balances.isLoading ? (
          [...Array(4)].map((_, i) => <ListRowSkeleton key={i} />)
        ) : (
          SUPPORTED_TOKENS.map(token => {
            const bal = balances[token.symbol as keyof typeof balances] ?? 0n;
            return (
              <div key={token.symbol} className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-700 text-base" style={{ background: `${token.color}22`, border: `1px solid ${token.color}44`, color: token.color }}>
                    {token.icon}
                  </div>
                  <div>
                    <div className="font-display font-600 text-sm text-white">{token.symbol}</div>
                    <div className="font-mono text-[10px] uppercase text-white/30">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base font-700 text-white">{formatTokenAmount(bal as bigint, 18, 4)}</div>
                  <div className="font-mono text-[10px] text-white/20">{token.symbol}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

function LPPositions() {
  const { allPools } = useDEXFactory();
  return (
    <motion.div className="glass-cyan rounded-2xl p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <h2 className="font-display font-700 text-base text-white mb-5 flex items-center gap-2">
        <Droplets className="w-4 h-4" style={{ color: 'var(--amber)' }} />
        Liquidity
      </h2>
      {allPools.length === 0 ? <p className="text-center py-12 text-white/30 font-mono text-xs">No LP positions found.</p> : (
        <div className="space-y-3">
          {allPools.map(addr => <PoolPosition key={addr} poolAddress={addr} />)}
        </div>
      )}
    </motion.div>
  );
}

function PoolPosition({ poolAddress }: { poolAddress: `0x${string}` }) {
  const pool = usePool(poolAddress);
  if (pool.userShares === 0n) return null;
  const tokenA = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === pool.tokenAAddr?.toLowerCase());
  const tokenB = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === pool.tokenBAddr?.toLowerCase());
  return (
    <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
      <div className="flex justify-between items-center">
        <span className="font-display font-700 text-sm">{tokenA?.symbol}/{tokenB?.symbol}</span>
        <span className="text-[10px] font-mono text-cyan-400">LP Shares: {formatTokenAmount(pool.userShares, 18, 2)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/20 p-2 rounded-lg"><span className="text-[10px] block text-white/30">{tokenA?.symbol}</span>{formatTokenAmount((pool.userShares * pool.reserves[0]) / pool.totalShares, 18, 2)}</div>
        <div className="bg-black/20 p-2 rounded-lg"><span className="text-[10px] block text-white/30">{tokenB?.symbol}</span>{formatTokenAmount((pool.userShares * pool.reserves[1]) / pool.totalShares, 18, 2)}</div>
      </div>
    </div>
  );
}

function NFTHoldings({ address }: { address: string }) {
  const { tokenIds, balance, refetch } = useUserNFTs();
  const { burn, isPending: isBurning, isSuccess: isBurned } = useBurnNFT();
  const publicClient           = usePublicClient();
  const [metas, setMetas]      = useState<Record<string, any>>({});

  useEffect(() => {
    if (isBurned) {
      refetch();
    }
  }, [isBurned, refetch]);

  useEffect(() => {
    if (!tokenIds.length || !publicClient) return;
    const fetchMetas = async () => {
      const newMetas: Record<string, any> = {};
      for (const id of tokenIds) {
        try {
          const uri = await publicClient.readContract({ address: CONTRACTS.NFT_COLLECTION, abi: NFT_COLLECTION_ABI, functionName: 'tokenURI', args: [id] }) as string;
          if (uri) { const res = await fetch(ipfsToHttp(uri)); newMetas[id.toString()] = await res.json(); }
        } catch {}
      }
      setMetas(newMetas);
    };
    fetchMetas();
  }, [tokenIds, publicClient]);

  return (
    <motion.div className="glass-cyan rounded-2xl p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex justify-between mb-6">
        <h2 className="font-display font-700 text-base text-white flex items-center gap-2"><LayoutGrid className="w-4 h-4" style={{ color: 'var(--amber)' }} /> NFTs</h2>
        <span className="tag-cyan">{balance.toString()} owned</span>
      </div>
      {balance.toString() === '0' && tokenIds.length === 0 ? <p className="text-center py-12 text-white/30 font-mono text-xs">No NFTs found.</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {tokenIds.length === 0 ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} height="150px" />)
          ) : (
            tokenIds.map(id => {
              const meta = metas[id.toString()];
              const img = meta?.image ? ipfsToHttp(meta.image) : null;
              return (
                <div key={id.toString()} className="group aspect-square rounded-xl overflow-hidden relative border border-white/10 bg-black/40">
                  {img ? <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center font-display text-2xl text-white/5">?</div>}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <button 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to PERMANENTLY DELETE NFT #${id}? This action cannot be undone.`)) {
                          burn(id);
                        }
                      }}
                      disabled={isBurning}
                      className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      title="Burn NFT"
                    >
                      {isBurning ? <motion.div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> : <Trash2 className="w-4 h-4" />}
                    </button>
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Permanent Burn</span>
                  </div>

                  <div className="absolute bottom-2 left-2 font-mono text-[12px] font-700 text-cyan-400 drop-shadow-md">#{id.toString()}</div>
                </div>
              );
            })
          )}
        </div>
      )}
    </motion.div>
  );
}
