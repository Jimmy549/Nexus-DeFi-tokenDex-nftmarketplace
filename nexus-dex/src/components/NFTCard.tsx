// ============================================================
//  components/NFTCard.tsx — NFT listing card
// ============================================================
'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tag, Zap, User, ShoppingCart, Check } from 'lucide-react';
import { type NFTListing } from '@/hooks/useNFTMarketplace';
import { type SupportedToken, SUPPORTED_TOKENS } from '@/config/contracts';
import { formatTokenAmount, ipfsToHttp, shortenAddress } from '@/lib/utils';
import { TokenSelector } from './TokenSelector';
import { usePriceInToken, useBuyNFT, useCancelListing } from '@/hooks/useNFTMarketplace';
import { CONTRACTS } from '@/config/contracts';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Trash2 } from 'lucide-react';

interface NFTCardProps {
  listing:  NFTListing;
  onBought?: () => void;
  index:    number;
}

export function NFTCard({ listing, onBought, index }: NFTCardProps) {
  const { isConnected } = useAccount();
  const { open }        = useAppKit();

  const [payToken, setPayToken] = useState<SupportedToken>(SUPPORTED_TOKENS[0]); // NXS default
  const [step,     setStep]     = useState<'idle' | 'approved'>('idle');

  const { priceInToken } = usePriceInToken(listing.listingId, payToken.address);
  const { buyWithNXS, executeBuyWithNXS, buyWithToken, executeBuyWithToken, isPending, isSuccess, txSuccess, txType } = useBuyNFT();
  const { cancel, isPending: isCancelling, isSuccess: isCancelled } = useCancelListing();

  const { address } = useAccount();
  const isSeller = address && listing.seller.toLowerCase() === address.toLowerCase();

  const isNXS    = payToken.address.toLowerCase() === CONTRACTS.PLATFORM_TOKEN.toLowerCase();
  const isMint   = listing.type === 0;
  const imageUrl = listing.metadata?.image ? ipfsToHttp(listing.metadata.image) : null;

  const handleBuy = () => {
    if (!isConnected) { open(); return; }
    
    if (step === 'idle') {
      if (isNXS) {
        buyWithNXS(listing.listingId, listing.priceInNXS);
      } else {
        buyWithToken(listing.listingId, payToken.address, priceInToken);
      }
    } else {
      if (isNXS) {
        executeBuyWithNXS(listing.listingId);
      } else {
        executeBuyWithToken(listing.listingId, payToken.address);
      }
    }
  };

  useEffect(() => {
    if (txSuccess || isCancelled) {
      setStep('idle');
      if (onBought) onBought();
    } else if (isSuccess && txType === 'approve') {
      setStep('approved');
    }
  }, [txSuccess, isSuccess, txType, onBought, isCancelled]);

  const buttonLabel = () => {
    if (isPending) return 'Processing...';
    if (!isConnected) return 'Connect Wallet';
    if (step === 'approved') return '2. Confirm Purchase';
    return `1. Approve ${payToken.symbol}`;
  };

  return (
    <motion.div
      className="glass-cyan rounded-xl flex flex-col transition-all duration-300 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
    >
      {/* ── Image area ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={listing.metadata?.name ?? `NFT #${listing.tokenId}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center font-display font-800 text-2xl"
              style={{ background: 'rgba(0,229,255,0.08)', border: '2px solid rgba(0,229,255,0.2)', color: 'var(--cyan)' }}
            >
              {isMint ? '✦' : `#${listing.tokenId.toString()}`}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
              {isMint ? 'Generative Drop' : 'Nexus Genesis'}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isMint ? (
            <span className="tag-cyan text-[9px] px-1.5 py-0.5 flex items-center gap-1 shadow-lg shadow-cyan-500/20">
              <Zap className="w-2.5 h-2.5" /> MINT
            </span>
          ) : (
            <span className="tag-purple text-[9px] px-1.5 py-0.5 flex items-center gap-1 shadow-lg shadow-purple-500/20">
              <Tag className="w-2.5 h-2.5" /> RESALE
            </span>
          )}
        </div>

        {listing.tokenId > 0n && !isMint && (
          <div className="absolute top-2 right-2 flex gap-2">
            <span className="tag-cyan bg-black/60 backdrop-blur-md text-[9px] px-1.5 py-0.5">#{listing.tokenId.toString()}</span>
            {isSeller && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Remove this listing from the marketplace?')) {
                    cancel(listing.listingId);
                  }
                }}
                disabled={isCancelling}
                className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                title="Cancel Listing"
              >
                {isCancelling ? <motion.div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="p-2.5 flex flex-col gap-2 flex-1">
        <div className="space-y-0.5">
          <h3 className="font-display font-700 text-[11px] md:text-xs text-white group-hover:text-cyan-400 transition-colors truncate">
            {listing.metadata?.name ?? (isMint ? 'Nexus Drop' : `Nexus #${listing.tokenId}`)}
          </h3>
          <div className="flex items-center gap-1">
            <User className="w-2.5 h-2.5 text-white/30" />
            <span className="font-mono text-[8px] text-white/30 truncate">
              {isMint ? 'Protocol' : shortenAddress(listing.seller)}
            </span>
          </div>
        </div>

        {/* Price Box */}
        <div className="p-1.5 rounded-lg bg-black/30 border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-mono text-white/40 uppercase">Price</span>
            <div className="flex items-center gap-1">
              {priceInToken === 0n && !isNXS ? (
                <span className="font-mono text-[8px] text-red-400 font-700">NO LIQUIDITY</span>
              ) : (
                <>
                  <span className="font-mono font-700 text-xs text-white">
                    {formatTokenAmount(priceInToken, 18, 2)}
                  </span>
                  <span className="text-[8px] font-mono font-700" style={{ color: payToken.color }}>
                    {payToken.symbol}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2">
          <TokenSelector
            value={payToken}
            onChange={(t) => { setPayToken(t); setStep('idle'); }}
            label=""
            showBalance
          />

          <button
            onClick={handleBuy}
            disabled={isPending || (priceInToken === 0n && !isNXS)}
            className={`w-full py-2 rounded-lg font-display font-700 text-[10px] flex items-center justify-center gap-2 transition-all duration-300 ${
              priceInToken === 0n && !isNXS
                ? 'bg-red-500/10 border border-red-500/20 text-red-500 cursor-not-allowed'
                : step === 'approved' 
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30' 
                  : 'bg-cyan-500 text-navy-800 hover:bg-cyan-400'
            }`}
          >
            {isPending ? (
              <motion.div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            ) : step === 'approved' ? (
              <Check className="w-4 h-4" />
            ) : priceInToken === 0n && !isNXS ? (
              null
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {priceInToken === 0n && !isNXS ? 'Create Pool to Buy' : buttonLabel()}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
