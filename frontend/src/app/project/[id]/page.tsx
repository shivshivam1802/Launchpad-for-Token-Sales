'use client';

import React, { useState, useEffect, use } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { launchpadApi, ProjectData } from '../../api';
import { ShieldCheck, Flame, Lock, Coins, ShieldAlert, Award, Calendar, CheckSquare, Clock, Users, ArrowUpRight } from 'lucide-react';
import { ethers } from 'ethers';

const SALE_ABI = [
  { name: 'purchase', type: 'function', stateMutability: 'payable', inputs: [{ name: '_amount', type: 'uint256' }, { name: '_referrer', type: 'address' }], outputs: [] },
  { name: 'createBuyerVesting', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_buyer', type: 'address' }], outputs: [] },
  { name: 'purchases', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalRaised', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'finalized', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'state', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
];

const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

const VESTING_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_scheduleId', type: 'uint256' }], outputs: [] },
  { name: 'getSchedulesByBeneficiary', type: 'function', stateMutability: 'view', inputs: [{ name: '_beneficiary', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
  { name: 'calculateClaimableAmount', type: 'function', stateMutability: 'view', inputs: [{ name: '_scheduleId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'schedules', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'token', type: 'address' }, { name: 'beneficiary', type: 'address' }, { name: 'start', type: 'uint256' }, { name: 'cliff', type: 'uint256' }, { name: 'duration', type: 'uint256' }, { name: 'interval', type: 'uint256' }, { name: 'tgeUnlockPct', type: 'uint256' }, { name: 'totalAmount', type: 'uint256' }, { name: 'releasedAmount', type: 'uint256' }, { name: 'revoked', type: 'bool' }] },
];

const VESTING_CONTRACT = '0x15c61aE9301931818B991F9a37E4a13e5E0fA616';
const USDT_CONTRACT = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetails({ params }: PageProps) {
  // Unwrap promise params
  const { id } = use(params);
  
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [vestingSchedules, setVestingSchedules] = useState<any[]>([]);

  // Contract Addresses
  const saleAddress = project?.contractAddress || '';

  // Contract Reads (Wagmi)
  const { data: totalRaisedWei, refetch: refetchRaised } = useReadContract({
    address: saleAddress as `0x${string}`,
    abi: SALE_ABI,
    functionName: 'totalRaised',
  });

  const { data: userPurchasesWei, refetch: refetchPurchases } = useReadContract({
    address: saleAddress as `0x${string}`,
    abi: SALE_ABI,
    functionName: 'purchases',
    args: address ? [address] : undefined,
  });

  const { data: isFinalized } = useReadContract({
    address: saleAddress as `0x${string}`,
    abi: SALE_ABI,
    functionName: 'finalized',
  });

  const { data: userUsdtBalance, refetch: refetchUsdt } = useReadContract({
    address: USDT_CONTRACT as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: beneficiaryScheduleIds } = useReadContract({
    address: VESTING_CONTRACT as `0x${string}`,
    abi: VESTING_ABI,
    functionName: 'getSchedulesByBeneficiary',
    args: address ? [address] : undefined,
  });

  const totalRaisedUSD = totalRaisedWei ? Number(ethers.formatUnits(totalRaisedWei as bigint, 6)) : 2250.0; // mock default fallback for UI
  const userPurchases = userPurchasesWei ? Number(ethers.formatUnits(userPurchasesWei as bigint, 6)) : 0;
  const usdtBalance = userUsdtBalance ? Number(ethers.formatUnits(userUsdtBalance as bigint, 6)) : 0;

  useEffect(() => {
    async function loadProject() {
      try {
        const details = await launchpadApi.getProjectDetails(id);
        setProject(details);
      } catch (err) {
        console.warn('Backend details fail. Mocking project page.');
        setProject({
          id,
          name: 'Aether Network',
          ticker: 'AETH',
          description: 'Decentralized high-throughput RPC infrastructure for Layer-2 blockchains. Solves latency issues for high frequency decentralized exchanges and yield vaults.',
          logoUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=200',
          bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
          status: 'APPROVED',
          contractAddress: '0x1234567890123456789012345678901234567890',
          tokenomics: { rate: '100' },
        });
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  useEffect(() => {
    if (beneficiaryScheduleIds && address) {
      loadVestingSchedules(beneficiaryScheduleIds as bigint[]);
    }
  }, [beneficiaryScheduleIds, address]);

  const loadVestingSchedules = async (ids: bigint[]) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const vestingContract = new ethers.Contract(VESTING_CONTRACT, VESTING_ABI, rpcProvider);
      const schedulesList = [];

      for (const sId of ids) {
        const schedule = await vestingContract.schedules(sId);
        const claimable = await vestingContract.calculateClaimableAmount(sId);

        schedulesList.push({
          id: Number(sId),
          token: schedule[0],
          total: Number(ethers.formatEther(schedule[7])),
          released: Number(ethers.formatEther(schedule[8])),
          claimable: Number(ethers.formatEther(claimable)),
        });
      }
      setVestingSchedules(schedulesList);
    } catch (err) {
      console.warn('Vesting schedule read failed. Displaying mock user schedule.');
      setVestingSchedules([
        { id: 0, token: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', total: 5000, released: 1000, claimable: 400 },
      ]);
    }
  };

  const handleBuy = async () => {
    if (!buyAmount || isNaN(Number(buyAmount)) || Number(buyAmount) <= 0 || !saleAddress) return;
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Executing token purchase...' });

    try {
      const amountWei = ethers.parseUnits(buyAmount, 6); // USDT is 6 decimals
      
      // 1. Approve Sale Contract to spend USDT
      await writeContractAsync({
        address: USDT_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [saleAddress, amountWei],
      });

      // 2. Call purchase
      await writeContractAsync({
        address: saleAddress as `0x${string}`,
        abi: SALE_ABI,
        functionName: 'purchase',
        args: [amountWei, ethers.ZeroAddress], // direct purchase
      });

      // Sync cache on database
      await launchpadApi.syncSaleState(saleAddress);

      setStatusMsg({ type: 'success', text: `Successfully purchased allocation for ${buyAmount} USDT!` });
      setBuyAmount('');
      refetchAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Purchase operation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVesting = async () => {
    if (!address || !saleAddress) return;
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Registering vesting schedule...' });

    try {
      await writeContractAsync({
        address: saleAddress as `0x${string}`,
        abi: SALE_ABI,
        functionName: 'createBuyerVesting',
        args: [address],
      });
      setStatusMsg({ type: 'success', text: 'Vesting schedule registered successfully! You can now claim unlocked tokens.' });
      refetchAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Vesting setup failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimVesting = async (scheduleId: number) => {
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Claiming unlocked tokens...' });

    try {
      await writeContractAsync({
        address: VESTING_CONTRACT as `0x${string}`,
        abi: VESTING_ABI,
        functionName: 'claim',
        args: [BigInt(scheduleId)],
      });
      setStatusMsg({ type: 'success', text: 'Tokens claimed successfully and transferred to your wallet!' });
      refetchAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Token claim failed.' });
    } finally {
      setLoading(false);
    }
  };

  const refetchAll = () => {
    refetchRaised();
    refetchPurchases();
    refetchUsdt();
    if (beneficiaryScheduleIds && address) {
      loadVestingSchedules(beneficiaryScheduleIds as bigint[]);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-web3Blue"></div>
      </div>
    );
  }

  const hardCap = 5000.0;
  const progressPct = (totalRaisedUSD / hardCap) * 100;
  const rate = Number(project.tokenomics?.rate || '100');
  const tokensReceived = Number(buyAmount || '0') * rate;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Banner */}
      <div className="h-64 md:h-80 w-full bg-[#111620] rounded-3xl overflow-hidden relative border border-glassBorder">
        {project.bannerUrl ? (
          <img src={project.bannerUrl} alt={project.name} className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-web3Blue/20 to-web3Purple/20"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-darkBg via-darkBg/30 to-transparent"></div>
        
        {/* Title Overlay */}
        <div className="absolute bottom-6 left-6 flex items-center space-x-4">
          {project.logoUrl ? (
            <img src={project.logoUrl} alt={project.name} className="w-20 h-20 rounded-2xl border-2 border-glassBorder object-cover shadow-xl" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-web3-gradient flex items-center justify-center font-bold text-white text-2xl shadow-xl">
              {project.ticker}
            </div>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">{project.name}</h2>
            <div className="flex items-center space-x-2 mt-1.5 text-xs text-web3TextSecondary">
              <span className="text-web3Blue bg-web3Blue/10 px-2.5 py-0.5 rounded font-bold">{project.ticker}</span>
              <span>•</span>
              <span className="font-semibold text-web3Green">KYC Audited</span>
            </div>
          </div>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 text-sm max-w-4xl ${
          statusMsg.type === 'success' ? 'bg-web3Green/10 text-web3Green border border-web3Green/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: About, Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* About Panel */}
          <div className="glass-panel p-8 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Project Description</h3>
            <p className="text-web3TextSecondary text-sm leading-relaxed">{project.description}</p>
          </div>

          {/* Vesting Schedules panel */}
          <div className="glass-panel p-8 rounded-3xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-glassBorder pb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-web3Purple" />
              <span>Your Vesting Schedules</span>
            </h3>

            {vestingSchedules.length === 0 ? (
              <div className="text-center py-6 text-xs text-web3TextSecondary">
                No active vesting allocations found for this address.
              </div>
            ) : (
              <div className="space-y-4">
                {vestingSchedules.map((sch) => (
                  <div key={sch.id} className="p-5 rounded-2xl bg-white/5 border border-glassBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-web3TextSecondary">Vesting ID #{sch.id}</p>
                      <p className="text-base font-bold text-white">{sch.total.toLocaleString()} {project.ticker}</p>
                      <p className="text-[10px] text-web3TextSecondary">Claimed: {sch.released.toLocaleString()} | Unclaimed: {(sch.total - sch.released).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-xs text-web3TextSecondary font-semibold">Available to Claim</p>
                        <p className="text-sm font-bold text-web3Green">{sch.claimable.toLocaleString()} {project.ticker}</p>
                      </div>
                      <button
                        onClick={() => handleClaimVesting(sch.id)}
                        disabled={loading || sch.claimable <= 0}
                        className="px-4 py-2 bg-web3Green hover:opacity-90 text-darkBg text-xs font-bold rounded-xl shadow-neon-green transition-all duration-150"
                      >
                        Claim
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: IDO Buy & Stats panel */}
        <div className="space-y-8">
          
          {/* Buy Card */}
          <div className="glass-panel p-8 rounded-3xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-glassBorder pb-4 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Flame className="w-5 h-5 text-web3Blue" />
                <span>IDO Sale Active</span>
              </span>
              <span className="text-[10px] bg-web3Blue/10 text-web3Blue border border-web3Blue/15 px-2 py-0.5 rounded font-bold animate-pulse">
                LIVE
              </span>
            </h3>

            {/* Countdown placeholder */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-glassBorder">
              <span className="text-xs text-web3TextSecondary font-bold">Ends in</span>
              <span className="text-sm font-bold text-white flex items-center space-x-1">
                <Clock className="w-4 h-4 text-web3Blue" />
                <span>00d : 14h : 22m : 45s</span>
              </span>
            </div>

            {/* Purchase statistics */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-web3TextSecondary">Allocation Sold</span>
                <span className="text-white font-bold">{progressPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-glassBorder">
                <div className="bg-web3-gradient h-full rounded-full" style={{ width: `${progressPct}%` }}></div>
              </div>
              <div className="flex justify-between text-[11px] text-web3TextSecondary">
                <span>{totalRaisedUSD.toLocaleString()} USDT</span>
                <span>{hardCap.toLocaleString()} USDT</span>
              </div>
            </div>

            {/* Input field */}
            <div className="space-y-4 pt-4">
              <div className="flex justify-between text-xs font-bold text-web3TextSecondary">
                <span>Purchase Amount</span>
                <span>Wallet: {usdtBalance.toLocaleString()} USDT</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full pl-4 pr-16 py-3.5 rounded-xl glass-input text-sm font-semibold"
                />
                <span className="absolute right-4 top-3.5 text-xs text-web3TextSecondary font-bold">USDT</span>
              </div>
              
              {buyAmount && (
                <div className="flex justify-between text-xs bg-white/5 p-3 rounded-xl border border-glassBorder">
                  <span className="text-web3TextSecondary">Tokens to Receive</span>
                  <span className="text-web3Blue font-bold">{tokensReceived.toLocaleString()} {project.ticker}</span>
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={loading || !isConnected}
                className="w-full py-3.5 bg-web3Blue hover:opacity-90 active:scale-95 text-darkBg font-extrabold rounded-xl shadow-neon-glow transition-all duration-150 text-sm"
              >
                Purchase Allocation
              </button>

              {userPurchases > 0 && !isFinalized && (
                <button
                  onClick={handleCreateVesting}
                  disabled={loading}
                  className="w-full py-3.5 bg-white/5 border border-glassBorder hover:bg-white/10 text-white font-bold rounded-xl transition-all duration-150 text-xs"
                >
                  Register Claim Vesting
                </button>
              )}
            </div>
          </div>

          {/* Core configuration details */}
          <div className="glass-panel p-8 rounded-3xl shadow-xl space-y-4 text-xs">
            <h4 className="font-bold text-white border-b border-glassBorder pb-3">Pool Information</h4>
            
            <div className="flex justify-between">
              <span className="text-web3TextSecondary">Token Rate</span>
              <span className="text-white font-semibold">1 USDT = {rate} {project.ticker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-web3TextSecondary">Min Purchase</span>
              <span className="text-white font-semibold">50 USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-web3TextSecondary">Max Purchase</span>
              <span className="text-white font-semibold">500 USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-web3TextSecondary">Liquidity Locked</span>
              <span className="text-web3Green font-bold">60% (365 Days)</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
