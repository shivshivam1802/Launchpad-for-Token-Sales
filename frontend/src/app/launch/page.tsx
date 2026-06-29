'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { launchpadApi, ProjectData } from '../api';
import { ArrowRight, ArrowLeft, CheckCircle, ShieldAlert, Rocket, Check, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';

export default function LaunchWizard() {
  const { isConnected, address } = useAccount();
  const [step, setStep] = useState(1);
  const [jwt, setJwt] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    description: '',
    logoUrl: '',
    bannerUrl: '',
    whitepaperUrl: '',
    websiteUrl: '',
    twitterUrl: '',
    telegramUrl: '',
    githubUrl: '',
    auditUrl: '',
    rate: '100', // 100 project tokens per 1 USDT
    softCap: '500',
    hardCap: '1000',
    minBuy: '50',
    maxBuy: '500',
    startTime: '',
    endTime: '',
    vestingStartOffset: '600', // e.g. 10 minutes after sale ends
    vestingCliff: '0',
    vestingDuration: '3600', // 1 hour linear vesting
    vestingInterval: '0', // continuous
    vestingTgeUnlockPct: '2000', // 20%
  });

  const [existingProjects, setExistingProjects] = useState<ProjectData[]>([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (token) {
      setJwt(token);
      loadMyProjects(token);
    }
  }, [address]);

  const loadMyProjects = async (token: string) => {
    try {
      const myProjects = await launchpadApi.getOwnerProjects(token);
      setExistingProjects(myProjects);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jwt) {
      setStatusMsg({ type: 'error', text: 'Please connect your wallet and complete signature login first.' });
      return;
    }

    setLoading(true);
    try {
      await launchpadApi.createProject(jwt, {
        name: formData.name,
        ticker: formData.ticker,
        logoUrl: formData.logoUrl,
        bannerUrl: formData.bannerUrl,
        description: formData.description,
        whitepaperUrl: formData.whitepaperUrl,
        websiteUrl: formData.websiteUrl,
        twitterUrl: formData.twitterUrl,
        telegramUrl: formData.telegramUrl,
        githubUrl: formData.githubUrl,
        auditUrl: formData.auditUrl,
        tokenomics: { rate: formData.rate },
      });

      setStatusMsg({ type: 'success', text: 'Launch application submitted successfully! Awaiting administrator approval.' });
      loadMyProjects(jwt);
      setStep(4);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit project listing' });
    } finally {
      setLoading(false);
    }
  };

  // Mock contract deploy trigger on-chain (using window.ethereum if approved)
  const handleDeployContract = async (project: ProjectData) => {
    if (!project.id || !jwt) return;
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Initializing wallet transaction deployment...' });

    try {
      // Connect using Ethers
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();

        // 1. Get Factory address (normally injected from config)
        const factoryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
        const factoryAbi = [
          'function createSale(tuple(address saleToken, address acceptedToken, uint256 rate, uint256 softCap, uint256 hardCap, uint256 minBuy, uint256 maxBuy, uint256 startTime, uint256 endTime, bool useTiers) config, tuple(uint256 start, uint256 cliff, uint256 duration, uint256 interval, uint256 tgeUnlockPct) vestingConfig) external returns (address saleAddress)'
        ];

        const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, signer);

        // We deploy a mock Project Token first, or use address of projectToken
        // For local simulation, we can deploy a new MockERC20 first
        const tokenFactory = new ethers.ContractFactory(
          ['constructor(string name, string symbol, uint8 decimals, uint256 initialSupply)'],
          '0x608060405234801561001057600080fd5b5060405161021438038061021483398101604052801561003357805190602001905b5050506000f300', // minimal contract bytecode stub or similar
          signer
        );
        // Better to query standard MockERC20 address we deployed earlier
        const deployedProjectToken = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'; 
        const mockUSDTAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

        const startTime = Math.floor(Date.now() / 1000) + 300; // 5 mins from now
        const endTime = startTime + 3600; // 1 hr duration

        const tx = await factoryContract.createSale(
          [
            deployedProjectToken,
            mockUSDTAddress,
            BigInt(formData.rate),
            ethers.parseUnits(formData.softCap, 6), // USDT decimals = 6
            ethers.parseUnits(formData.hardCap, 6),
            ethers.parseUnits(formData.minBuy, 6),
            ethers.parseUnits(formData.maxBuy, 6),
            BigInt(startTime),
            BigInt(endTime),
            true // useTiers
          ],
          [
            BigInt(endTime + Number(formData.vestingStartOffset)),
            BigInt(formData.vestingCliff),
            BigInt(formData.vestingDuration),
            BigInt(formData.vestingInterval),
            BigInt(formData.vestingTgeUnlockPct)
          ]
        );

        const receipt = await tx.wait();
        console.log('On-chain deployment transaction confirmed:', receipt);

        // Synchronize backend with the deployed sale
        // For development we can query factory to find address or mock sync
        const mockAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
        await launchpadApi.linkContract(jwt, project.id, mockAddress);
        await launchpadApi.cacheNewSale(mockAddress, address!);

        setStatusMsg({ type: 'success', text: `Token Sale deployed successfully at address: ${mockAddress}` });
        loadMyProjects(jwt);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'On-chain deployment failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      
      {/* Headings */}
      <div className="text-center mb-10">
        <Rocket className="w-12 h-12 text-web3Blue mx-auto mb-3 shadow-neon-glow p-2 bg-web3Blue/10 rounded-2xl" />
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Create a Token Sale IDO</h2>
        <p className="text-web3TextSecondary text-sm mt-2">
          List your project and initialize secure fundraising smart contracts.
        </p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl mb-8 flex items-center space-x-3 text-sm ${
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

      {/* Main Panel */}
      <div className="glass-panel p-8 rounded-3xl shadow-xl">
        {step < 4 && (
          <div className="flex justify-between items-center mb-8 border-b border-glassBorder pb-6">
            {[
              { num: 1, label: 'Metadata' },
              { num: 2, label: 'Sale Config' },
              { num: 3, label: 'Vesting & Preview' },
            ].map((s) => (
              <div key={s.num} className="flex items-center space-x-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step === s.num
                    ? 'bg-web3-gradient text-white shadow-neon-glow'
                    : step > s.num
                    ? 'bg-web3Green/25 text-web3Green'
                    : 'bg-white/5 text-web3TextSecondary border border-glassBorder'
                }`}>
                  {step > s.num ? <Check className="w-4.5 h-4.5" /> : s.num}
                </span>
                <span className={`text-xs font-semibold ${step === s.num ? 'text-white' : 'text-web3TextSecondary'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Step 1: Project Metadata */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Project Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Project Name*</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="e.g. Solara Protocol" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Token Ticker*</label>
                  <input type="text" name="ticker" required value={formData.ticker} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="e.g. SOLAR" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-web3TextSecondary mb-2">Description / Elevator Pitch*</label>
                <textarea name="description" required value={formData.description} onChange={handleInputChange} rows={3} className="w-full px-4 py-3 rounded-xl glass-input text-sm resize-none" placeholder="Provide a detailed description of your blockchain project..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Logo URL (Image)</label>
                  <input type="url" name="logoUrl" value={formData.logoUrl} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="https://unsplash.com/..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Banner URL (Cover Image)</label>
                  <input type="url" name="bannerUrl" value={formData.bannerUrl} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="https://unsplash.com/..." />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white pt-4 mb-4">Socials & Documentation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Website Link</label>
                  <input type="url" name="websiteUrl" value={formData.websiteUrl} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="https://website.io" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Whitepaper (PDF Link)</label>
                  <input type="url" name="whitepaperUrl" value={formData.whitepaperUrl} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="https://website.io/whitepaper.pdf" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Twitter (X)</label>
                  <input type="url" name="twitterUrl" value={formData.twitterUrl} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="https://x.com/..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Telegram</label>
                  <input type="url" name="telegramUrl" value={formData.telegramUrl} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="https://t.me/..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">GitHub</label>
                  <input type="url" name="githubUrl" value={formData.githubUrl} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="https://github.com/..." />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="button" onClick={() => setStep(2)} className="flex items-center space-x-1 px-5 py-3 bg-web3Blue text-darkBg font-bold rounded-xl shadow-neon-glow hover:opacity-90 transition-all duration-150">
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Sale Config */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Fundraising Rates & Caps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Project Token Rate (tokens per 1 USDT)*</label>
                  <input type="number" name="rate" required value={formData.rate} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Accepted Payment Currency</label>
                  <input type="text" disabled value="USDT (Mock ERC20)" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-glassBorder text-web3TextSecondary text-sm cursor-not-allowed" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Soft Cap (USDT)*</label>
                  <input type="number" name="softCap" required value={formData.softCap} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Hard Cap (USDT)*</label>
                  <input type="number" name="hardCap" required value={formData.hardCap} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Min Purchase Limit (USDT)*</label>
                  <input type="number" name="minBuy" required value={formData.minBuy} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Max Purchase Limit (USDT)*</label>
                  <input type="number" name="maxBuy" required value={formData.maxBuy} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(1)} className="flex items-center space-x-1 px-5 py-3 bg-white/5 border border-glassBorder text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-150">
                  <ArrowLeft className="w-4 h-4 animate-pulse" />
                  <span>Back</span>
                </button>
                <button type="button" onClick={() => setStep(3)} className="flex items-center space-x-1 px-5 py-3 bg-web3Blue text-darkBg font-bold rounded-xl shadow-neon-glow hover:opacity-90 transition-all duration-150">
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Vesting Schedule & Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Vesting & Release Calendar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">TGE Release Percentage (Basis Points)*</label>
                  <input type="number" name="vestingTgeUnlockPct" required value={formData.vestingTgeUnlockPct} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="e.g. 2000 = 20%" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Vesting Duration (seconds)*</label>
                  <input type="number" name="vestingDuration" required value={formData.vestingDuration} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" placeholder="e.g. 3600 = 1 hour" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Vesting Cliff Period (seconds)*</label>
                  <input type="number" name="vestingCliff" required value={formData.vestingCliff} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-web3TextSecondary mb-2">Unlock Interval (seconds; 0 for linear)</label>
                  <input type="number" name="vestingInterval" required value={formData.vestingInterval} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-sm" />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(2)} className="flex items-center space-x-1 px-5 py-3 bg-white/5 border border-glassBorder text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-150">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-web3-gradient text-white font-extrabold rounded-xl shadow-neon-glow hover:opacity-90 active:scale-95 transition-all duration-150"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success / Listing Admin status */}
          {step === 4 && (
            <div className="text-center py-10 space-y-6">
              <CheckCircle className="w-16 h-16 text-web3Green mx-auto shadow-neon-green p-2 bg-web3Green/10 rounded-2xl animate-bounce" />
              <h3 className="text-2xl font-bold text-white">Application Logged!</h3>
              <p className="text-web3TextSecondary text-sm max-w-md mx-auto">
                Your project has been successfully stored in the database cache. Admin approval is required before you can deploy the fundraising pool contract on-chain.
              </p>
              
              <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 bg-white/5 border border-glassBorder text-white rounded-xl text-xs font-semibold hover:bg-white/10 transition-all duration-150">
                Register Another Project
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Active Drafts for Contract deployment */}
      {existingProjects.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold text-white mb-6">Your Applications & Pools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {existingProjects.map((project) => (
              <div key={project.id} className="glass-panel p-6 rounded-2xl border border-glassBorder flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-base font-bold text-white">{project.name} ({project.ticker})</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      project.status === 'APPROVED'
                        ? 'bg-web3Green/10 text-web3Green'
                        : project.status === 'PENDING'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-web3TextSecondary line-clamp-2 mb-4">{project.description}</p>
                </div>

                <div className="pt-4 border-t border-glassBorder flex items-center justify-between">
                  {project.contractAddress ? (
                    <div className="text-xs text-web3Green flex items-center space-x-1.5">
                      <Check className="w-4.5 h-4.5" />
                      <span>Sale Contract: {project.contractAddress.substring(0, 10)}...</span>
                    </div>
                  ) : project.status === 'APPROVED' ? (
                    <button
                      onClick={() => handleDeployContract(project)}
                      disabled={loading}
                      className="px-4 py-2 bg-web3-gradient hover:opacity-90 text-white text-xs font-bold rounded-lg shadow-neon-glow flex items-center space-x-1.5 transition-all duration-150"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      <span>Deploy Sale Pool Contract</span>
                    </button>
                  ) : (
                    <div className="text-xs text-web3TextSecondary flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>Awaiting approval to deploy</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
