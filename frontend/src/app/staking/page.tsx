'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Sparkles, Trophy, PlusCircle, MinusCircle, Gift, AlertCircle, ArrowUpRight, Flame } from 'lucide-react';
import { ethers } from 'ethers';

// ABI snippets for read/write
const STAKING_ABI = [
  { name: 'stake', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_amount', type: 'uint256' }], outputs: [] },
  { name: 'claimRewards', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'getUserTier', type: 'function', stateMutability: 'view', inputs: [{ name: '_user', type: 'address' }], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'getUserTierMultiplier', type: 'function', stateMutability: 'view', inputs: [{ name: '_user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getPendingReward', type: 'function', stateMutability: 'view', inputs: [{ name: '_user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'userInfo', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: 'amount', type: 'uint256' }, { name: 'rewardDebt', type: 'uint256' }, { name: 'lastStakeTime', type: 'uint256' }] },
];

const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

const STAKING_CONTRACT = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const LAUNCH_TOKEN_CONTRACT = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // mock utility token

export default function StakingPage() {
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Read User Staked Info
  const { data: userStakingData, refetch: refetchStaking } = useReadContract({
    address: STAKING_CONTRACT as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'userInfo',
    args: address ? [address] : undefined,
  });

  const { data: userTierData, refetch: refetchTier } = useReadContract({
    address: STAKING_CONTRACT as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'getUserTier',
    args: address ? [address] : undefined,
  });

  const { data: pendingRewardsData, refetch: refetchRewards } = useReadContract({
    address: STAKING_CONTRACT as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'getPendingReward',
    args: address ? [address] : undefined,
  });

  const { data: userTokenBalance, refetch: refetchBalance } = useReadContract({
    address: LAUNCH_TOKEN_CONTRACT as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const stakedBalance = userStakingData ? Number(ethers.formatEther((userStakingData as any)[0])) : 0;
  const currentTierId = userTierData ? Number(userTierData) : 0;
  const pendingRewards = pendingRewardsData ? Number(ethers.formatEther(pendingRewardsData as bigint)) : 0;
  const launchBalance = userTokenBalance ? Number(ethers.formatEther(userTokenBalance as bigint)) : 0;

  const tiers = [
    { id: 1, name: 'Bronze', required: 1000, multiplier: '1.0x', color: 'border-amber-700 text-amber-600 bg-amber-500/5' },
    { id: 2, name: 'Silver', required: 5000, multiplier: '1.5x', color: 'border-slate-400 text-slate-300 bg-slate-400/5' },
    { id: 3, name: 'Gold', required: 10000, multiplier: '3.0x', color: 'border-yellow-500 text-yellow-400 bg-yellow-500/5' },
    { id: 4, name: 'Diamond', required: 25000, multiplier: '6.0x', color: 'border-cyan-400 text-cyan-300 bg-cyan-400/5' },
    { id: 5, name: 'VIP', required: 50000, multiplier: '15.0x', color: 'border-indigo-400 text-indigo-300 bg-indigo-500/5 font-extrabold shadow-neon-glow' },
  ];

  const handleStake = async () => {
    if (!stakeAmount || isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) return;
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Executing stake transaction...' });

    try {
      const amountWei = ethers.parseEther(stakeAmount);
      
      // 1. Approve Staking contract to spend tokens
      await writeContractAsync({
        address: LAUNCH_TOKEN_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [STAKING_CONTRACT, amountWei],
      });

      // 2. Call stake
      await writeContractAsync({
        address: STAKING_CONTRACT as `0x${string}`,
        abi: STAKING_ABI,
        functionName: 'stake',
        args: [amountWei],
      });

      setStatusMsg({ type: 'success', text: `Successfully staked ${stakeAmount} $LAUNCH tokens!` });
      setStakeAmount('');
      refetchAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Stake transaction failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || isNaN(Number(unstakeAmount)) || Number(unstakeAmount) <= 0) return;
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Executing unstake transaction...' });

    try {
      const amountWei = ethers.parseEther(unstakeAmount);
      await writeContractAsync({
        address: STAKING_CONTRACT as `0x${string}`,
        abi: STAKING_ABI,
        functionName: 'withdraw',
        args: [amountWei],
      });

      setStatusMsg({ type: 'success', text: `Successfully unstaked ${unstakeAmount} $LAUNCH tokens!` });
      setUnstakeAmount('');
      refetchAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Unstake transaction failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (pendingRewards <= 0) return;
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Claiming yield rewards...' });

    try {
      await writeContractAsync({
        address: STAKING_CONTRACT as `0x${string}`,
        abi: STAKING_ABI,
        functionName: 'claimRewards',
      });
      setStatusMsg({ type: 'success', text: 'Staking yield rewards claimed successfully!' });
      refetchAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Claim rewards failed.' });
    } finally {
      setLoading(false);
    }
  };

  const refetchAll = () => {
    refetchStaking();
    refetchTier();
    refetchRewards();
    refetchBalance();
  };

  const currentTier = tiers.find(t => t.id === currentTierId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Top Banner */}
      <div className="text-center mb-12">
        <Trophy className="w-12 h-12 text-web3Gold mx-auto mb-3 shadow-neon-glow p-2 bg-web3Gold/10 rounded-2xl" />
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Staking & Allocations Tiers</h2>
        <p className="text-web3TextSecondary text-sm mt-2 max-w-xl mx-auto">
          Stake platform utility tokens ($LAUNCH) to unlock guaranteed purchase allocations for upcoming initial token sales.
        </p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl mb-8 flex items-center space-x-3 text-sm max-w-3xl mx-auto ${
          statusMsg.type === 'success'
            ? 'bg-web3Green/10 text-web3Green border border-web3Green/20'
            : statusMsg.type === 'error'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-web3Blue/10 text-web3Blue border border-web3Blue/20'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        
        {/* Stake Controls */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl space-y-6 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-glassBorder pb-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-web3Blue" />
              <span>Yield Farming & Tier Staking</span>
            </h3>
            <span className="text-xs bg-white/5 border border-glassBorder px-3 py-1 rounded-full text-web3TextSecondary font-semibold">
              APY: 18.5%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Deposit Box */}
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-web3TextSecondary">
                <span>Stake LAUNCH</span>
                <span>Balance: {launchBalance.toLocaleString()}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full pl-4 pr-16 py-3.5 rounded-xl glass-input text-sm font-semibold"
                />
                <button
                  onClick={() => setStakeAmount(launchBalance.toString())}
                  className="absolute right-3 top-3 px-2 py-1 text-[10px] bg-web3Blue/20 text-web3Blue border border-web3Blue/30 hover:bg-web3Blue hover:text-darkBg rounded font-bold transition-all duration-150"
                >
                  MAX
                </button>
              </div>
              <button
                onClick={handleStake}
                disabled={loading || !isConnected}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-web3Blue hover:opacity-90 active:scale-95 text-darkBg font-extrabold rounded-xl shadow-neon-glow transition-all duration-150"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Stake Tokens</span>
              </button>
            </div>

            {/* Withdraw Box */}
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-web3TextSecondary">
                <span>Unstake LAUNCH</span>
                <span>Staked: {stakedBalance.toLocaleString()}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="w-full pl-4 pr-16 py-3.5 rounded-xl glass-input text-sm font-semibold"
                />
                <button
                  onClick={() => setUnstakeAmount(stakedBalance.toString())}
                  className="absolute right-3 top-3 px-2 py-1 text-[10px] bg-web3Blue/20 text-web3Blue border border-web3Blue/30 hover:bg-web3Blue hover:text-darkBg rounded font-bold transition-all duration-150"
                >
                  MAX
                </button>
              </div>
              <button
                onClick={handleUnstake}
                disabled={loading || !isConnected || stakedBalance <= 0}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-white/5 border border-glassBorder hover:bg-white/10 text-white font-bold rounded-xl transition-all duration-150"
              >
                <MinusCircle className="w-4 h-4" />
                <span>Unstake Tokens</span>
              </button>
            </div>

          </div>

          {/* Staking Yield Rewards Claim panel */}
          <div className="p-5 rounded-2xl bg-white/5 border border-glassBorder flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-web3Green/10 rounded-xl">
                <Gift className="w-6 h-6 text-web3Green" />
              </div>
              <div>
                <p className="text-xs text-web3TextSecondary font-semibold">Pending Staking Yield</p>
                <p className="text-xl font-bold text-white">{pendingRewards.toLocaleString()} LAUNCH</p>
              </div>
            </div>

            <button
              onClick={handleClaimRewards}
              disabled={loading || !isConnected || pendingRewards <= 0}
              className="px-6 py-3 bg-web3Green hover:opacity-90 text-darkBg font-extrabold rounded-xl shadow-neon-green flex items-center space-x-1.5 transition-all duration-150 text-sm"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Claim Yield Yields</span>
            </button>
          </div>
        </div>

        {/* User Current Tier Status */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-glassBorder pb-4">Staking Status Profile</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs text-web3TextSecondary font-bold">Total Staked Balance</span>
                <p className="text-3xl font-extrabold text-white tracking-tight">{stakedBalance.toLocaleString()} <span className="text-sm font-semibold text-web3TextSecondary">LAUNCH</span></p>
              </div>

              <div>
                <span className="text-xs text-web3TextSecondary font-bold">Current Allocation Tier</span>
                {currentTier ? (
                  <div className={`mt-2 flex items-center justify-between p-3.5 rounded-xl border ${currentTier.color}`}>
                    <span className="font-bold text-base">{currentTier.name} Tier</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-white/10">{currentTier.multiplier} multiplier</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between p-3.5 rounded-xl border border-glassBorder bg-white/5">
                    <span className="text-sm text-web3TextSecondary">None (No Tier unlocked)</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-white/10">0.0x multiplier</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-web3Blue/10 border border-web3Blue/15 text-xs text-web3TextSecondary leading-relaxed">
            Allocations multipliers boost purchase amounts. Upgrading to Gold (10k LAUNCH staked) increases maximum buy allocations by 3x compared to baseline limits.
          </div>
        </div>

      </div>

      {/* Tier Details Row */}
      <h3 className="text-xl font-bold text-white mb-6">Overview of Multi-Tier Staking system</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {tiers.map((t) => {
          const isUserCurrent = t.id === currentTierId;
          return (
            <div
              key={t.id}
              className={`p-6 rounded-2xl border transition-all duration-200 ${t.color} ${
                isUserCurrent ? 'ring-2 ring-web3Blue scale-105 shadow-xl' : 'opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-sm">{t.name}</span>
                {isUserCurrent && (
                  <span className="px-2 py-0.5 rounded bg-web3Blue text-darkBg text-[9px] font-bold">
                    Active
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5 mb-6">
                <p className="text-xs text-web3TextSecondary">Required Tokens</p>
                <p className="text-lg font-bold text-white tracking-tight">{t.required.toLocaleString()} LAUNCH</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-web3TextSecondary">Allocation Multiplier</span>
                <p className="text-base font-bold text-white">{t.multiplier}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
