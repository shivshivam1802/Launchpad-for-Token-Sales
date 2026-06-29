'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Users, Link as LinkIcon, Gift, Copy, Check, Info } from 'lucide-react';
import { ethers } from 'ethers';

const REFERRAL_ABI = [
  { name: 'getReferralInfo', type: 'function', stateMutability: 'view', inputs: [{ name: '_user', type: 'address' }], outputs: [{ name: 'referrer', type: 'address' }, { name: 'referredCount', type: 'uint256' }] },
  { name: 'referralRewards', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

const REFERRAL_CONTRACT = '0x1591f8682FAD994E8d423985F2C5578788876c11';
const USDT_CONTRACT = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

export default function ReferralPage() {
  const { isConnected, address } = useAccount();

  const [copied, setCopied] = useState(false);
  const [rewardsUSD, setRewardsUSD] = useState(0.0);

  // Read referral info
  const { data: referralData } = useReadContract({
    address: REFERRAL_CONTRACT as `0x${string}`,
    abi: REFERRAL_ABI,
    functionName: 'getReferralInfo',
    args: address ? [address] : undefined,
  });

  const { data: rewardBalanceData } = useReadContract({
    address: REFERRAL_CONTRACT as `0x${string}`,
    abi: REFERRAL_ABI,
    functionName: 'referralRewards',
    args: address ? [address, USDT_CONTRACT] : undefined,
  });

  const parentReferrer = referralData ? (referralData as any)[0] : ethers.ZeroAddress;
  const referredCount = referralData ? Number((referralData as any)[1]) : 0;

  useEffect(() => {
    if (rewardBalanceData) {
      setRewardsUSD(Number(ethers.formatUnits(rewardBalanceData as bigint, 6))); // USDT decimals is 6
    }
  }, [rewardBalanceData]);

  const getRefLink = () => {
    if (!address) return 'Connect wallet to generate referral link';
    return `${window.location.origin}/dashboard?ref=${address}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getRefLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Banner */}
      <div className="text-center mb-12">
        <Gift className="w-12 h-12 text-web3Purple mx-auto mb-3 shadow-neon-glow p-2 bg-web3Purple/10 rounded-2xl" />
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Referral Rewards Program</h2>
        <p className="text-web3TextSecondary text-sm mt-2 max-w-xl mx-auto">
          Invite friends to participate in vetted token sales. Earn multi-level commission payouts directly into your wallet upon successful purchases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Link Panel */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-glassBorder pb-4">Your Invitation Link</h3>
          
          <div className="space-y-3">
            <label className="block text-xs font-bold text-web3TextSecondary">Referral Link</label>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={getRefLink()}
                className="w-full pl-4 pr-12 py-3.5 rounded-xl glass-input text-xs font-mono text-web3Blue cursor-default"
              />
              <button
                onClick={copyToClipboard}
                disabled={!address}
                className="absolute right-3 p-1.5 bg-white/5 border border-glassBorder hover:bg-white/10 text-white rounded-lg transition-all duration-150"
              >
                {copied ? <Check className="w-4 h-4 text-web3Green" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-glassBorder flex items-center space-x-4">
              <div className="p-3 bg-web3Blue/10 rounded-xl">
                <Users className="w-6 h-6 text-web3Blue" />
              </div>
              <div>
                <p className="text-xs text-web3TextSecondary font-semibold">Total Referred Users</p>
                <p className="text-2xl font-bold text-white mt-0.5">{referredCount} Users</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-glassBorder flex items-center space-x-4">
              <div className="p-3 bg-web3Purple/10 rounded-xl">
                <Gift className="w-6 h-6 text-web3Purple" />
              </div>
              <div>
                <p className="text-xs text-web3TextSecondary font-semibold">Total Commissions Earned</p>
                <p className="text-2xl font-bold text-white mt-0.5">${rewardsUSD.toFixed(2)} USDT</p>
              </div>
            </div>
          </div>
        </div>

        {/* Level breakdown */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-glassBorder pb-4">Commission Structures</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 border border-glassBorder rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">Level 1 Referral</p>
                  <p className="text-xs text-web3TextSecondary mt-0.5">Direct Referee IDO buying</p>
                </div>
                <span className="text-base font-extrabold text-web3Blue">5.0%</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white/5 border border-glassBorder rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">Level 2 Referral</p>
                  <p className="text-xs text-web3TextSecondary mt-0.5">Referee of direct referee</p>
                </div>
                <span className="text-base font-extrabold text-web3Purple">2.0%</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-start space-x-2 p-4 rounded-xl bg-white/5 border border-glassBorder text-[11px] text-web3TextSecondary leading-relaxed">
            <Info className="w-4 h-4 text-web3Blue flex-shrink-0 mt-0.5" />
            <div>
              Referrer relations are registered on-chain during referee purchase operations. Commissions are instantly credited to your referral balance.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
