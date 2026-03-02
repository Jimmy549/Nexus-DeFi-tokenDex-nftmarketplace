// ============================================================
//  app/marketplace/page.tsx — NFT Marketplace page
// ============================================================
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout } from '@/components/PageLayout';
import { NFTCard } from '@/components/NFTCard';
import {   useNFTListings, 
  useCreateResaleListing, 
  useUserNFTs, 
  useMintNFT 
} from '@/hooks/useNFTMarketplace';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { NFT_COLLECTION_ABI } from '@/config/abis';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils';
import { Image, Plus, RefreshCw, Search, Tag, Zap, ShoppingBag } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { useTokenBalances } from '@/hooks/useDEX';

const FilterTabs = [
  { id: 'all',    label: 'All Listings' },
  { id: 'resale', label: 'Resale' },
];

type FilterType = 'all' | 'resale';

export default function MarketplacePage() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chain } = useAccount(); // Added chain
  const { open } = useAppKit();
  const balances = useTokenBalances(); // Added balances

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWrongChain = mounted && isConnected && chain?.id !== 11155111; // Added isWrongChain
  const { listings, loading, refetch } = useNFTListings();

  const [filter,      setFilter]      = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showList,    setShowList]    = useState(false);
  const [showMint,    setShowMint]    = useState(false);

  const { refetch: refetchUserNFTs } = useUserNFTs();

  const { mint, isPending: isMinting } = useMintNFT();

  const handleFastMint = () => {
    if (!address) return;
    mint(address);
  };

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: CONTRACTS.NFT_COLLECTION, abi: NFT_COLLECTION_ABI,
    functionName: 'totalSupply',
    query: { refetchInterval: 5000 },
  });
  const { data: maxSupply } = useReadContract({
    address: CONTRACTS.NFT_COLLECTION, abi: NFT_COLLECTION_ABI,
    functionName: 'MAX_SUPPLY',
  });

  const filtered = listings
    .filter(l => {
      // Always hide type 0 (Protocol Mint) items from the marketplace grid
      if (l.type === 0) return false;
      
      if (filter === 'resale' && l.type !== 1) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          l.tokenId.toString().includes(q) ||
          l.metadata?.name?.toLowerCase().includes(q) ||
          l.seller.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => Number(b.listingId - a.listingId)); // Newest first

  return (
    <>
      {/* Added global nav for network check */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        {isWrongChain && (
          <div className="bg-red-500/90 text-white text-[10px] font-mono text-center py-1 backdrop-blur-md">
            ⚠️ WRONG NETWORK. PLEASE SWITCH TO SEPOLIA TESTNET.
          </div>
        )}
      </nav>
      <PageLayout
        title="NFT Marketplace"
        subtitle={mounted ? `Discover ${listings.filter(l => l.type === 1).length} active resale listings. Buy Nexus Genesis NFTs with any supported token.` : "Loading marketplace..."}
        accentColor="var(--green)"
      >
        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Listings',  value: listings.filter(l => l.type === 1).length.toString()     },
            { label: 'Total Minted',     value: totalSupply?.toString() ?? '0'                          },
            { label: 'Max Supply',       value: '20'                                                    },
          ].map((s, i) => (
            <div key={i} className="stat-box">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value text-2xl">{s.value}</span>
            </div>
          ))}
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
            {FilterTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as FilterType)}
                className={`px-4 py-2 rounded-lg font-display text-xs font-600 transition-all ${
                  filter === t.id 
                    ? 'bg-cyan-500 text-navy-900 shadow-lg shadow-cyan-500/20' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="input-cyber pl-9 py-2 text-xs w-48"
              />
            </div>

            {/* Refresh */}
            <button onClick={() => refetch()} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:rotate-180 duration-300" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }} title="Refresh listings">
              <RefreshCw className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>

            {/* Global Actions */}
            {isConnected && (
              <>
                <button
                  onClick={() => setShowMint(true)}
                  className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-display font-700 text-xs flex items-center gap-2 hover:bg-green-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> Mint NFT
                </button>

                <button
                  onClick={() => setShowList(true)}
                  className="btn-cyan px-4 py-2 flex items-center gap-2 text-xs whitespace-nowrap"
                >
                  <Tag className="w-4 h-4" /> List NFT
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {[...Array(16)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,255,157,0.06)', border: '1px solid rgba(0,255,157,0.15)' }}>
              <ShoppingBag className="w-10 h-10" style={{ color: 'rgba(0,255,157,0.4)' }} />
            </div>
            <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {searchQuery ? 'No listings match your search.' : 'No active listings yet.'}
            </p>
            {filter === 'resale' && isConnected && (
              <button 
                onClick={() => handleFastMint()} 
                disabled={isMinting}
                className="btn-cyan px-8 py-3 flex items-center gap-2"
                style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.4)', color: 'var(--cyan)' }}
              >
                <Zap className="w-5 h-5 text-cyan-400" /> {isMinting ? 'Minting...' : 'MINT NEW NFT'}
              </button>
            )}
            {!isConnected && (
              <button onClick={() => open()} className="btn-cyan text-sm px-6 py-2">
                Connect Wallet
              </button>
            )}
          </div>
        ) : (
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {filtered.map((listing, i) => (
              <NFTCard
                key={`${listing.listingId}-${listing.tokenId}-${i}`}
                listing={listing}
                index={i}
                onBought={refetch}
              />
            ))}
          </motion.div>
        )}

        {/* ── List NFT Modal ── */}
        <AnimatePresence>
          {showList && (
            <ListNFTModal onClose={() => setShowList(false)} onListed={refetch} />
          )}
          {showMint && (
            <MintNFTModal onClose={() => setShowMint(false)} onMinted={() => { refetch(); refetchUserNFTs(); refetchTotalSupply(); }} />
          )}
        </AnimatePresence>
      </PageLayout>
    </>
  );
}

// ─── List NFT Modal ───────────────────────────────────────────
function ListNFTModal({ onClose, onListed }: { onClose: () => void, onListed: () => void }) {
  const { tokenIds } = useUserNFTs();
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [price,      setPrice]      = useState('');
  const [step,       setStep]       = useState<'idle' | 'approving' | 'listing'>('idle');

  const { approveNFT, createListing, isPending, isSuccess, isApproved } = useCreateResaleListing();

  useEffect(() => {
    if (isApproved) {
      setStep('listing');
    }
  }, [isApproved]);

  useEffect(() => {
    if (isSuccess && step === 'listing') {
      onListed();
      setTimeout(onClose, 2000);
    }
  }, [isSuccess, step, onListed, onClose]);

  const handleList = () => {
    if (!selectedId || !price) return;
    const priceWei = parseTokenAmount(price);
    if (step === 'idle') {
      approveNFT(selectedId);
      setStep('approving');
    } else {
      createListing(selectedId, priceWei);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative glass-cyan rounded-2xl p-6 w-full max-w-md"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-700 text-lg text-white flex items-center gap-2">
            <Tag className="w-5 h-5" style={{ color: 'var(--cyan)' }} /> List NFT for Sale
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white" style={{ background: 'rgba(255,255,255,0.05)' }}>✕</button>
        </div>

        {tokenIds.length === 0 ? (
          <p className="font-mono text-sm text-center py-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            You don&apos;t own any Nexus Genesis NFTs yet.
          </p>
        ) : (
          <>
            <div className="mb-4">
              <span className="stat-label block mb-2">Select NFT</span>
              <div className="grid grid-cols-4 gap-2">
                {tokenIds.map(id => (
                  <button
                    key={id.toString()}
                    onClick={() => setSelectedId(id)}
                    className="aspect-square rounded-xl flex items-center justify-center font-mono text-sm font-700 transition-all duration-150"
                    style={{
                      background: selectedId === id ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.3)',
                      border:     `1px solid ${selectedId === id ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color:      selectedId === id ? 'var(--cyan)' : 'rgba(255,255,255,0.75)',
                    }}
                  >
                    #{id.toString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <span className="stat-label block mb-2">Price (NXS)</span>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 500" className="input-cyber text-lg" />
            </div>

            <button
              onClick={handleList}
              disabled={!selectedId || !price || isPending}
              className="w-full btn-cyan-solid py-3 flex items-center justify-center gap-2"
            >
              {isPending ? 'Processing...' : step === 'idle' ? 'Step 1: Approve NFT' : 'Step 2: Create Listing'}
            </button>
            
            {isSuccess && (
              <p className="mt-2 text-[10px] font-mono text-center text-green-400">
                {step === 'approving' ? 'NFT Approved! You can now click "Step 2"' : '🎉 NFT Listed successfully! Refreshing...'}
              </p>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Mint NFT Modal ───────────────────────────────────────────
function MintNFTModal({ onClose, onMinted }: { onClose: () => void; onMinted: () => void }) {
  const { address } = useAccount();
  const { mint, isPending, isSuccess } = useMintNFT();

  useEffect(() => {
    if (isSuccess) {
      onMinted();
      setTimeout(onClose, 2000);
    }
  }, [isSuccess, onClose, onMinted]);

  const handleMint = () => {
    if (!address) return;
    mint(address);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative glass-cyan rounded-2xl p-6 w-full max-w-sm"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-700 text-lg text-white flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: 'var(--cyan)' }} /> Mint New NFT
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            ✕
          </button>
        </div>

        <div className="bg-black/20 rounded-xl p-8 mb-6 border border-white/5 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h4 className="font-display font-700 text-white text-base">Nexus Genesis</h4>
            <p className="text-[10px] font-mono text-white/30 mt-1 uppercase tracking-widest">
              Protocol Mint
            </p>
          </div>
        </div>

        <button
          onClick={handleMint}
          disabled={isPending || isSuccess}
          className="w-full btn-cyan-solid py-4 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <motion.div
              className="w-5 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {isPending ? 'Confirming...' : isSuccess ? 'Success!' : 'Mint NFT'}
        </button>

        {isSuccess && (
          <p className="mt-4 text-[11px] font-mono text-center text-green-400 animate-pulse">
            🎉 Minted successfully! Refreshing...
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}



