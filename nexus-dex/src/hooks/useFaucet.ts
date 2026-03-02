// ============================================================
//  hooks/useFaucet.ts — Faucet contract interaction hook
// ============================================================
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { FAUCET_ABI } from '@/config/abis';
import toast from 'react-hot-toast';

export function useFaucet() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // --- Read: can user claim? ---
  const { data: canClaim, refetch: refetchCanClaim } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'canClaim',
    args: [address!],
    query: { enabled: !!address, refetchInterval: 1000 },
  });

  // --- Read: seconds until next claim ---
  const { data: cooldownSeconds, refetch: refetchCooldown } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'getTimeUntilNextClaim',
    args: [address!],
    query: { enabled: !!address, refetchInterval: 1000 },
  });

  // --- Read: total claimed by user ---
  const { data: totalClaimed, refetch: refetchTotal } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'getTotalClaimed',
    args: [address!],
    query: { enabled: !!address, refetchInterval: false },
  });

  // --- Read: global stats ---
  const { data: globalTotal } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'globalTotalDistributed',
    query: { refetchInterval: false },
  });

  const { data: claimAmount } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'CLAIM_AMOUNT',
    query: { refetchInterval: false },
  });

  const { data: faucetTokenAddr } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'token',
    query: { refetchInterval: false },
  });

  const { data: usesMint } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'usesMint',
    query: { refetchInterval: false },
  });

  const { data: cooldownPeriod } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'COOLDOWN',
    query: { refetchInterval: false },
  });

  // --- Action: claim ---
  const claim = useCallback(() => {
    if (!isConnected) { toast.error('Connect your wallet first'); return; }
    if (!canClaim) { toast.error('Cooldown active — try again later'); return; }
    writeContract({
      address: CONTRACTS.FAUCET,
      abi: FAUCET_ABI,
      functionName: 'claimTokens',
    });
    toast.loading('Submitting claim...', { id: 'faucet-tx' });
  }, [isConnected, canClaim, writeContract]);

  // Toast on confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success('Transaction confirmed!', { id: 'faucet-tx' });
      refetchCanClaim();
      refetchCooldown();
      refetchTotal();
    }
  }, [isConfirmed, refetchCanClaim, refetchCooldown, refetchTotal]);

  useEffect(() => {
    if (writeError) {
      toast.error(writeError.message.split('\n')[0], { id: 'faucet-tx' });
    }
  }, [writeError]);

  return {
    canClaim: canClaim ?? false,
    cooldownSeconds: Number(cooldownSeconds ?? 0n),
    totalClaimed: totalClaimed ?? 0n,
    globalTotal: globalTotal ?? 0n,
    claimAmount: claimAmount ?? 0n,
    cooldownPeriod: Number(cooldownPeriod ?? 86400n),
    faucetTokenAddr: faucetTokenAddr as `0x${string}`,
    usesMint: usesMint as boolean,
    claim,
    isClaiming: isWritePending || isConfirming,
    isConfirmed,
    txHash,
  };
}
