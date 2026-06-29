'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { launchpadApi, ProjectData } from '../api';
import { Search, Flame, Calendar, CheckSquare, TrendingUp, DollarSign, Users, Award, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [stats, setStats] = useState<any>({
    totalRaised: '1,420,500',
    tvl: '2,059,225',
    participants: '4,285',
    averageROI: '320%',
    claimRate: '87.5%',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'ended'>('live');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [projData, statData] = await Promise.all([
          launchpadApi.getProjects('APPROVED'),
          launchpadApi.getAnalytics().catch(() => null),
        ]);
        
        // If contract deployments exist, merge or format
        setProjects(projData);
        if (statData) setStats(statData);
      } catch (error) {
        console.warn('Backend connection failed. Displaying premium mock dashboard data.');
        // Setup mock projects for demonstration
        setProjects([
          {
            id: 'mock-1',
            name: 'Aether Network',
            ticker: 'AETH',
            description: 'Decentralized high-throughput RPC infrastructure for Layer-2 blockchains.',
            logoUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=200',
            bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
            status: 'APPROVED',
            contractAddress: '0x1234567890123456789012345678901234567890',
            tokenomics: { rate: '100' }, // 100 AETH per USDT
          },
          {
            id: 'mock-2',
            name: 'Solara Labs',
            ticker: 'SOLAR',
            description: 'AI-assisted yield optimization engine and multi-chain liquidity aggregate.',
            logoUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&q=80&w=200',
            bannerUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=1200',
            status: 'APPROVED',
            contractAddress: '0x2345678901234567890123456789012345678901',
            tokenomics: { rate: '50' },
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-12 p-8 md:p-12 bg-card-gradient border border-glassBorder flex flex-col md:flex-row justify-between items-center">
        <div className="absolute inset-0 bg-web3-gradient opacity-10 blur-xl"></div>
        
        <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-web3Blue/10 text-web3Blue shadow-neon-glow">
            <Flame className="w-3.5 h-3.5 mr-1" />
            Trending IDO Platform
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            The Gateway to Decentralized <span className="text-web3Blue">Token Sales</span>
          </h1>
          <p className="text-web3TextSecondary text-sm md:text-base">
            Participate in vetted blockchain protocol launches. Stake platform tokens to lock early whitelist tier allocations and earn yield.
          </p>
        </div>

        <div className="mt-8 md:mt-0 relative z-10 flex gap-4">
          <Link href="/launch" className="px-6 py-3 bg-web3-gradient hover:opacity-90 active:scale-95 text-white font-bold rounded-xl shadow-neon-glow transition-all duration-200 text-sm">
            Launch Your Project
          </Link>
          <Link href="/staking" className="px-6 py-3 bg-white/5 border border-glassBorder hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 text-sm">
            Stake $LAUNCH
          </Link>
        </div>
      </div>

      {/* Analytics Counter Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
        {[
          { label: 'TVL Locked', val: `$${stats.tvl}`, icon: DollarSign, color: 'text-web3Blue' },
          { label: 'Total Capital Raised', val: `$${stats.totalRaised}`, icon: TrendingUp, color: 'text-web3Green' },
          { label: 'Unique Participants', val: stats.participants, icon: Users, color: 'text-web3Purple' },
          { label: 'Average ROI', val: stats.averageROI, icon: Award, color: 'text-web3Gold' },
          { label: 'Claim Payout Rate', val: stats.claimRate, icon: CheckSquare, color: 'text-white' },
        ].map((item, idx) => (
          <div key={idx} className="glass-panel p-5 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-web3TextSecondary">{item.label}</span>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <p className="text-xl md:text-2xl font-bold text-white tracking-tight">{item.val}</p>
          </div>
        ))}
      </div>

      {/* Filter and Tab Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-glassBorder pb-6">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-2 bg-white/5 p-1 rounded-xl max-w-sm">
          {[
            { id: 'live', name: 'Live Sales', icon: Flame },
            { id: 'upcoming', name: 'Upcoming', icon: Calendar },
            { id: 'ended', name: 'Ended', icon: CheckSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-web3Blue text-darkBg shadow-neon-glow font-bold'
                  : 'text-web3TextSecondary hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-web3TextSecondary" />
          <input
            type="text"
            placeholder="Search by project name or ticker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl glass-input text-sm"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-web3Blue"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-3xl border border-dashed border-glassBorder">
          <p className="text-web3TextSecondary text-base">No active projects found matching current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ y: -4 }}
              className="glass-panel glass-panel-hover rounded-3xl overflow-hidden shadow-xl flex flex-col h-full"
            >
              {/* Banner */}
              <div className="relative h-44 w-full bg-[#111620]">
                {project.bannerUrl ? (
                  <img src={project.bannerUrl} alt={project.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-web3Blue/20 to-web3Purple/20"></div>
                )}
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-[#0B0E14]/80 text-web3Blue border border-glassBorder shadow-lg">
                  {activeTab.toUpperCase()}
                </span>
              </div>

              {/* Card Details */}
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center space-x-3 mb-4">
                  {project.logoUrl ? (
                    <img src={project.logoUrl} alt={project.name} className="w-12 h-12 rounded-xl border border-glassBorder object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-web3-gradient flex items-center justify-center font-bold text-white">
                      {project.ticker}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center space-x-1.5">
                      <span>{project.name}</span>
                      <span className="text-xs text-web3Blue bg-web3Blue/10 px-2 py-0.5 rounded-md font-semibold">{project.ticker}</span>
                    </h3>
                    <p className="text-xs text-web3TextSecondary truncate max-w-[180px]">
                      {project.contractAddress ? `Contract: ${project.contractAddress.substring(0, 6)}...` : 'Contract Pending'}
                    </p>
                  </div>
                </div>

                <p className="text-web3TextSecondary text-xs leading-relaxed mb-6 flex-grow">
                  {project.description}
                </p>

                {/* Progress bar */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-web3TextSecondary">Allocation Sold</span>
                    <span className="text-white">68% / 100%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-glassBorder">
                    <div className="bg-web3-gradient h-full rounded-full" style={{ width: '68%' }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-web3TextSecondary">
                    <span>Raised: 3,400 USDT</span>
                    <span>Hard Cap: 5,000 USDT</span>
                  </div>
                </div>

                {/* Action button */}
                <Link
                  href={project.contractAddress ? `/project/${project.id}` : '#'}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                    project.contractAddress
                      ? 'bg-white/5 border border-glassBorder hover:border-web3Blue/30 hover:bg-web3Blue/10 hover:text-web3Blue text-white shadow-sm'
                      : 'bg-white/5 border border-glassBorder text-web3TextSecondary cursor-not-allowed'
                  }`}
                >
                  <span>{project.contractAddress ? 'View Allocation Pool' : 'Awaiting Deployment'}</span>
                  {project.contractAddress && <ExternalLink className="w-3.5 h-3.5" />}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
