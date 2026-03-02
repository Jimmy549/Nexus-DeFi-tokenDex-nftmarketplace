// ============================================================
//  hooks/useDEX.ts — DEX factory + liquidity pool hooks
// ============================================================
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { CONTRACTS, SUPPORTED_TOKENS } from '@/config/contracts';
import { DEX_FACTORY_ABI, LIQUIDITY_POOL_ABI, ERC20_ABI } from '@/config/abis';
import { parseTokenAmount, formatTokenAmount } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useReadContracts } from 'wagmi';

// ─── Factory hook ────────────────────────────────────────────
export function useDEXFactory() {
  const { data: allPools } = useReadContract({
    address: CONTRACTS.DEX_FACTORY,
    abi: DEX_FACTORY_ABI,
    functionName: 'getAllPools',
  });

  return { allPools: allPools as readonly `0x${string}`[] ?? [], poolCount: BigInt(allPools?.length ?? 0) };
}

// ─── Single pool hook ─────────────────────────────────────────
export function usePool(poolAddress: `0x${string}` | undefined) {
  const { address } = useAccount();
  const enabled = !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000';

  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: poolAddress,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'getReserves',
    query: { enabled, refetchInterval: 5000 },
  });

  const { data: userShares, refetch: refetchShares } = useReadContract({
    address: poolAddress,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'sharesOf',
    args: [address!],
    query: { enabled: enabled && !!address, refetchInterval: 5000 },
  });

  const { data: totalShares } = useReadContract({
    address: poolAddress,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'totalShares',
    query: { enabled, refetchInterval: 5000 },
  });

  const { data: tokenAAddr } = useReadContract({
    address: poolAddress,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'tokenA',
    query: { enabled },
  });

  const { data: tokenBAddr } = useReadContract({
    address: poolAddress,
    abi: LIQUIDITY_POOL_ABI,
    functionName: 'tokenB',
    query: { enabled },
  });

  return {
    reserves: (reserves as [bigint, bigint]) ?? [0n, 0n],
    userShares: (userShares as bigint) ?? 0n,
    totalShares: (totalShares as bigint) ?? 0n,
    tokenAAddr: tokenAAddr as `0x${string}` | undefined,
    tokenBAddr: tokenBAddr as `0x${string}` | undefined,
    refetchReserves,
    refetchShares,
  };
}

// ─── Swap hook ───────────────────────────────────────────────
export function useSwap(poolAddress: `0x${string}` | undefined) {
  const { isConnected } = useAccount();
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending, isSuccess, error } = useWaitForTransactionReceipt({ hash: txHash });

  const [txType, setTxType] = useState<'approve' | 'swap' | null>(null);

  const approveAndSwap = useCallback((tokenInAddress: `0x${string}`, amountIn: bigint) => {
    if (!isConnected || !poolAddress) return;
    setTxType('approve');
    writeContract({
      address: tokenInAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [poolAddress, amountIn],
    });
  }, [isConnected, poolAddress, writeContract]);

  const executeSwap = useCallback((direction: 'AtoB' | 'BtoA', amountIn: bigint) => {
    if (!poolAddress) return;
    setTxType('swap');
    writeContract({
      address: poolAddress,
      abi: LIQUIDITY_POOL_ABI,
      functionName: direction === 'AtoB' ? 'swapAforB' : 'swapBforA',
      args: [amountIn],
    });
  }, [poolAddress, writeContract]);

  useEffect(() => {
    if (isSuccess) {
      if (txType === 'approve') toast.success('Approved! Confirming swap...');
      else if (txType === 'swap') toast.success('Swap complete!');
      setTxType(null);
    }
    if (error) {
      toast.error(error.message.split('\n')[0]);
      setTxType(null);
    }
  }, [isSuccess, error, txType]);

  return { approveAndSwap, executeSwap, isPending, txSuccess: isSuccess && txType === 'swap', txType };
}

// ─── Liquidity hook ──────────────────────────────────────────
export function useLiquidity(poolAddress: `0x${string}` | undefined) {
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending, isSuccess, error } = useWaitForTransactionReceipt({ hash: txHash });

  const [txType, setTxType] = useState<'approveA' | 'approveB' | 'add' | 'remove' | null>(null);

  const approveToken = useCallback((tokenAddr: `0x${string}`, amount: bigint, isA: boolean) => {
    if (!poolAddress) return;
    setTxType(isA ? 'approveA' : 'approveB');
    writeContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'approve', args: [poolAddress, amount] });
  }, [poolAddress, writeContract]);

  const addLiquidity = useCallback((amountA: bigint, amountB: bigint) => {
    if (!poolAddress) return;
    setTxType('add');
    writeContract({ address: poolAddress, abi: LIQUIDITY_POOL_ABI, functionName: 'addLiquidity', args: [amountA, amountB] });
  }, [poolAddress, writeContract]);

  const removeLiquidity = useCallback((shares: bigint) => {
    if (!poolAddress) return;
    setTxType('remove');
    writeContract({ address: poolAddress, abi: LIQUIDITY_POOL_ABI, functionName: 'removeLiquidity', args: [shares] });
  }, [poolAddress, writeContract]);

  useEffect(() => {
    if (isSuccess) {
      if (txType === 'add') toast.success('Liquidity added!');
      else if (txType === 'remove') toast.success('Liquidity removed!');
      setTxType(null);
    }
    if (error) {
      toast.error(error.message.split('\n')[0]);
      setTxType(null);
    }
  }, [isSuccess, error, txType]);

  return { approveToken, addLiquidity, removeLiquidity, isPending, isSuccess, txType };
}

// ─── Unified Tokens hook ──────────────────────────────────────
export function useTokenBalances() {
  const { address } = useAccount();

  // ERC20 Balances
  const erc20Tokens = SUPPORTED_TOKENS;
  const { data: results, isLoading: isLoadingErc20 } = useReadContracts({
    contracts: erc20Tokens.map(token => ({
      address: token.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address!],
    })),
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    }
  });

  const balances: Record<string, bigint> = {};

  erc20Tokens.forEach((token, i) => {
    balances[token.symbol] = results?.[i]?.result as bigint ?? 0n;
  });

  return {
    ...balances,
    isLoading: isLoadingErc20,
  };
}
