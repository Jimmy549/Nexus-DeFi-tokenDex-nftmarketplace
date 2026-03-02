// ============================================================
//  hooks/useNFTMarketplace.ts — NFT marketplace hooks
// ============================================================
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { NFT_MARKETPLACE_ABI, NFT_COLLECTION_ABI, ERC20_ABI } from '@/config/abis';
import { ipfsToHttp } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface NFTListing {
  listingId: bigint;
  tokenId: bigint;
  seller: `0x${string}`;
  priceInNXS: bigint;
  type: number; // 0=MINT, 1=RESALE
  metadata?: NFTMetadata;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: { trait_type: string; value: string | number }[];
}

// ─── All listings ────────────────────────────────────────────
export function useNFTListings() {
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();

  const { data: raw, refetch } = useReadContract({
    address: CONTRACTS.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'listAllNFTs',
  });

  useEffect(() => {
    if (!raw || !publicClient) {
      if (!raw) setLoading(false);
      return;
    }

    const [listingIds, tokenIds, sellers, prices, types] = raw as [
      readonly bigint[], readonly bigint[], readonly `0x${string}`[],
      readonly bigint[], readonly number[]
    ];

    const assembled: NFTListing[] = listingIds.map((id, i) => ({
      listingId: id,
      tokenId: tokenIds[i],
      seller: sellers[i],
      priceInNXS: prices[i],
      type: types[i],
    }));

    // Fetch metadata for listings
    const fetchAllData = async () => {
      const withMeta = await Promise.all(
        assembled.map(async (l) => {
          if (l.type === 0) {
            // Protocol mints always use a generic genesis metadata
            l.metadata = {
              name: "Nexus Genesis Drop",
              description: "Official Nexus Genesis protocol mint. Purchase to receive the next available token identity.",
              image: "ipfs://QmZ4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8",
            };
          } else {
            try {
              const uri = await publicClient.readContract({
                address: CONTRACTS.NFT_COLLECTION,
                abi: NFT_COLLECTION_ABI,
                functionName: 'tokenURI',
                args: [l.tokenId],
              }) as string;

              if (uri) {
                l.metadata = await fetchMetadata(uri);
              }
            } catch (e) {
              l.metadata = {
                name: `Nexus #${l.tokenId}`,
                description: "Nexus Genesis NFT - Part of the core Nexus ecosystem.",
                image: "ipfs://QmZ4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8Z4M8",
              };
            }
          }
          return l;
        })
      );
      setListings(withMeta);
      setLoading(false);
    };

    fetchAllData();
  }, [raw, publicClient, refetch]);

  return { listings, loading, refetch };
}

async function fetchMetadata(uri: string): Promise<NFTMetadata | undefined> {
  try {
    const url = ipfsToHttp(uri);
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  }
}

// ─── Buy NFT Hook (Consolidated) ──────────────────────────────
export function useBuyNFT() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending, isSuccess, error } = useWaitForTransactionReceipt({ hash: txHash });

  const [txType, setTxType] = useState<'approve' | 'buy' | null>(null);

  const buyWithNXS = useCallback((listingId: bigint, priceInNXS: bigint) => {
    if (!isConnected) { toast.error('Connect wallet'); return; }
    setTxType('approve');
    writeContract({
      address: CONTRACTS.PLATFORM_TOKEN,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.NFT_MARKETPLACE, priceInNXS],
    });
  }, [isConnected, writeContract]);

  const executeBuyWithNXS = useCallback((listingId: bigint) => {
    if (!isConnected) return;
    setTxType('buy');
    writeContract({
      address: CONTRACTS.NFT_MARKETPLACE,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'buyNFTWithPlatformToken',
      args: [listingId],
    });
  }, [isConnected, writeContract]);

  const buyWithToken = useCallback((listingId: bigint, paymentToken: `0x${string}`, tokenAmount: bigint) => {
    if (!isConnected) { toast.error('Connect wallet'); return; }
    if (tokenAmount === 0n) { toast.error('Incompatible token or no liquidity'); return; }
    setTxType('approve');
    writeContract({
      address: paymentToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.NFT_MARKETPLACE, tokenAmount],
    });
  }, [isConnected, writeContract]);

  const executeBuyWithToken = useCallback((listingId: bigint, paymentToken: `0x${string}`) => {
    if (!isConnected) return;
    setTxType('buy');
    writeContract({
      address: CONTRACTS.NFT_MARKETPLACE,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'buyNFTWithToken',
      args: [listingId, paymentToken],
    });
  }, [isConnected, writeContract]);

  useEffect(() => {
    if (isSuccess) {
      if (txType === 'approve') {
        toast.success('Approved! Now purchase.');
      } else if (txType === 'buy') {
        toast.success('🎉 Purchased successfully!');
        setTxType(null);
      }
    }
    if (error) {
      toast.error(error.message.split('\n')[0]);
      setTxType(null);
    }
  }, [isSuccess, error, txType]);

  return {
    buyWithNXS, executeBuyWithNXS, buyWithToken, executeBuyWithToken,
    isPending, isSuccess, txSuccess: isSuccess && txType === 'buy',
    txType
  };
}

// ─── Price in token ───────────────────────────────────────────
export function usePriceInToken(listingId: bigint | undefined, paymentToken: `0x${string}` | undefined) {
  const { data: priceInNXS } = useReadContract({
    address: CONTRACTS.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'getNFTPriceInNXS',
    args: [listingId!],
    query: { enabled: !!listingId, refetchInterval: 10000 },
  });

  const { data: priceInToken } = useReadContract({
    address: CONTRACTS.NFT_MARKETPLACE,
    abi: NFT_MARKETPLACE_ABI,
    functionName: 'calculatePriceInToken',
    args: [listingId!, paymentToken!],
    query: { enabled: !!listingId && !!paymentToken && paymentToken !== CONTRACTS.PLATFORM_TOKEN, refetchInterval: 10000 },
  });

  return {
    priceInNXS: priceInNXS as bigint ?? 0n,
    priceInToken: paymentToken === CONTRACTS.PLATFORM_TOKEN ? (priceInNXS as bigint ?? 0n) : (priceInToken as bigint ?? 0n),
  };
}

// ─── User NFTs ────────────────────────────────────────────────
export function useUserNFTs() {
  const { address } = useAccount();

  const { data: tokenIds, refetch } = useReadContract({
    address: CONTRACTS.NFT_COLLECTION,
    abi: NFT_COLLECTION_ABI,
    functionName: 'tokensOfOwner',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: balance } = useReadContract({
    address: CONTRACTS.NFT_COLLECTION,
    abi: NFT_COLLECTION_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });

  return {
    tokenIds: tokenIds as readonly bigint[] ?? [],
    balance: balance as bigint ?? 0n,
    refetch,
  };
}

// ─── Create resale listing ────────────────────────────────────
export function useCreateResaleListing() {
  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess, isLoading: isPending, error } = useWaitForTransactionReceipt({ hash: txHash });
  const [txType, setTxType] = useState<'approve' | 'list' | null>(null);

  const approveNFT = useCallback((tokenId: bigint) => {
    setTxType('approve');
    writeContract({
      address: CONTRACTS.NFT_COLLECTION,
      abi: NFT_COLLECTION_ABI,
      functionName: 'approve',
      args: [CONTRACTS.NFT_MARKETPLACE, tokenId],
    });
  }, [writeContract]);

  const createListing = useCallback((tokenId: bigint, priceInNXS: bigint) => {
    setTxType('list');
    writeContract({
      address: CONTRACTS.NFT_MARKETPLACE,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'createResaleListing',
      args: [tokenId, priceInNXS],
    });
  }, [writeContract]);

  useEffect(() => {
    if (isSuccess) {
      if (txType === 'approve') {
        toast.success('NFT Approved! Now list it.');
      } else if (txType === 'list') {
        toast.success('NFT listed for sale!');
        setTxType(null);
      }
    }
    if (error) {
      toast.error(error.message.split('\n')[0]);
      setTxType(null);
    }
  }, [isSuccess, error, txType]);

  return {
    approveNFT, createListing, isPending, isSuccess, txType,
    isApproved: isSuccess && txType === 'approve'
  };
}

// ─── Mint NFT hook ───────────────────────────────────────────
export function useMintNFT() {
  const { isConnected } = useAccount();
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending, isSuccess, error } = useWaitForTransactionReceipt({ hash: txHash });

  const mint = useCallback((to: `0x${string}`) => {
    if (!isConnected) { toast.error('Connect wallet'); return; }
    writeContract({
      address: CONTRACTS.NFT_COLLECTION,
      abi: NFT_COLLECTION_ABI,
      functionName: 'mintNFT',
      args: [to],
    });
  }, [isConnected, writeContract]);

  useEffect(() => {
    if (isSuccess) { toast.success('🎉 NFT Minted successfully!'); }
    if (error) { toast.error(error.message.split('\n')[0]); }
  }, [isSuccess, error]);

  return { mint, isPending, isSuccess };
}

// ─── Burn NFT hook ───────────────────────────────────────────
export function useBurnNFT() {
  const { isConnected } = useAccount();
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending, isSuccess, error } = useWaitForTransactionReceipt({ hash: txHash });

  const burn = useCallback((tokenId: bigint) => {
    if (!isConnected) { toast.error('Connect wallet'); return; }
    writeContract({
      address: CONTRACTS.NFT_COLLECTION,
      abi: NFT_COLLECTION_ABI,
      functionName: 'burn',
      args: [tokenId],
    });
  }, [isConnected, writeContract]);

  useEffect(() => {
    if (isSuccess) { toast.success('🔥 NFT Burned successfully!'); }
    if (error) { toast.error(error.message.split('\n')[0]); }
  }, [isSuccess, error]);

  return { burn, isPending, isSuccess };
}

// ─── Cancel Listing hook ──────────────────────────────────────
export function useCancelListing() {
  const { isConnected } = useAccount();
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending, isSuccess, error } = useWaitForTransactionReceipt({ hash: txHash });

  const cancel = useCallback((listingId: bigint) => {
    if (!isConnected) { toast.error('Connect wallet'); return; }
    writeContract({
      address: CONTRACTS.NFT_MARKETPLACE,
      abi: NFT_MARKETPLACE_ABI,
      functionName: 'cancelListing',
      args: [listingId],
    });
  }, [isConnected, writeContract]);

  useEffect(() => {
    if (isSuccess) { toast.success('Listing cancelled successfully!'); }
    if (error) { toast.error(error.message.split('\n')[0]); }
  }, [isSuccess, error]);

  return { cancel, isPending, isSuccess };
}
