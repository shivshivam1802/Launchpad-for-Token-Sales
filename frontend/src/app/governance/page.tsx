'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Vote, FileText, CheckCircle, XCircle, Play, AlertCircle, PlusCircle } from 'lucide-react';
import { ethers } from 'ethers';

const GOVERNANCE_ABI = [
  { name: 'propose', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_description', type: 'string' }], outputs: [{ name: 'proposalId', type: 'uint256' }] },
  { name: 'castVote', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_proposalId', type: 'uint256' }, { name: '_support', type: 'bool' }], outputs: [] },
  { name: 'executeProposal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [] },
  { name: 'getProposalDetails', type: 'function', stateMutability: 'view', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [{ name: 'id', type: 'uint256' }, { name: 'proposer', type: 'address' }, { name: 'description', type: 'string' }, { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'forVotes', type: 'uint256' }, { name: 'againstVotes', type: 'uint256' }, { name: 'executed', type: 'bool' }] },
  { name: 'proposalCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getProposalState', type: 'function', stateMutability: 'view', inputs: [{ name: '_proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }] },
];

const GOVERNANCE_CONTRACT = '0x9A676e19053d311CD3F2d02b37B26F28D0ac7c24';

interface Proposal {
  id: number;
  proposer: string;
  description: string;
  forVotes: number;
  againstVotes: number;
  executed: boolean;
  state: string; // Active, Succeeded, Defeated, Executed
}

export default function GovernancePage() {
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [newProposalText, setNewProposalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Read proposal count
  const { data: proposalCountData } = useReadContract({
    address: GOVERNANCE_CONTRACT as `0x${string}`,
    abi: GOVERNANCE_ABI,
    functionName: 'proposalCount',
  });

  const proposalCount = proposalCountData ? Number(proposalCountData) : 0;

  useEffect(() => {
    loadProposals();
  }, [proposalCount]);

  const loadProposals = async () => {
    if (proposalCount > 0) {
      try {
        const fetchedProposals: Proposal[] = [];
        // Connect provider to read
        const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const govContract = new ethers.Contract(GOVERNANCE_CONTRACT, GOVERNANCE_ABI, rpcProvider);

        for (let i = 0; i < proposalCount; i++) {
          const detail = await govContract.getProposalDetails(i);
          const stateId = await govContract.getProposalState(i);
          
          const states = ['Active', 'Succeeded', 'Defeated', 'Executed'];

          fetchedProposals.push({
            id: Number(detail[0]),
            proposer: detail[1],
            description: detail[2],
            forVotes: Number(ethers.formatEther(detail[5])),
            againstVotes: Number(ethers.formatEther(detail[6])),
            executed: detail[7],
            state: states[Number(stateId)] || 'Active',
          });
        }
        setProposals(fetchedProposals);
      } catch (err) {
        console.warn('EVM provider reading failed. Loading mock DAO proposals.');
        loadMocks();
      }
    } else {
      loadMocks();
    }
  };

  const loadMocks = () => {
    setProposals([
      {
        id: 0,
        proposer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        description: 'Approve Aether Network listing application for upcoming IDO Pool',
        forVotes: 125000,
        againstVotes: 1200,
        executed: true,
        state: 'Executed',
      },
      {
        id: 1,
        proposer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        description: 'Lower staking threshold requirement for Silver tier qualification to 4000 LAUNCH',
        forVotes: 85000,
        againstVotes: 98000,
        executed: false,
        state: 'Defeated',
      },
      {
        id: 2,
        proposer: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        description: 'Approve Solara Labs allocation request for upcoming IDO listing',
        forVotes: 48000,
        againstVotes: 3200,
        executed: false,
        state: 'Active',
      }
    ]);
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposalText.trim()) return;
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Submitting proposal on-chain...' });

    try {
      await writeContractAsync({
        address: GOVERNANCE_CONTRACT as `0x${string}`,
        abi: GOVERNANCE_ABI,
        functionName: 'propose',
        args: [newProposalText],
      });

      setStatusMsg({ type: 'success', text: 'Proposal submitted successfully! Voting is now active.' });
      setNewProposalText('');
      loadProposals();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit proposal.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    setLoading(true);
    setStatusMsg({ type: 'info', text: `Voting ${support ? 'FOR' : 'AGAINST'}...` });

    try {
      await writeContractAsync({
        address: GOVERNANCE_CONTRACT as `0x${string}`,
        abi: GOVERNANCE_ABI,
        functionName: 'castVote',
        args: [BigInt(proposalId), support],
      });

      setStatusMsg({ type: 'success', text: 'Vote submitted successfully and recorded on-chain!' });
      loadProposals();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to cast vote.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (proposalId: number) => {
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Executing successful proposal...' });

    try {
      await writeContractAsync({
        address: GOVERNANCE_CONTRACT as `0x${string}`,
        abi: GOVERNANCE_ABI,
        functionName: 'executeProposal',
        args: [BigInt(proposalId)],
      });

      setStatusMsg({ type: 'success', text: 'Proposal executed successfully and finalized.' });
      loadProposals();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Execution failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Banner */}
      <div className="text-center mb-12">
        <Vote className="w-12 h-12 text-web3Blue mx-auto mb-3 shadow-neon-glow p-2 bg-web3Blue/10 rounded-2xl" />
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Governance DAO Portal</h2>
        <p className="text-web3TextSecondary text-sm mt-2 max-w-xl mx-auto">
          Participate in launchpad decisions. Use your staked LAUNCH tokens to vote on candidate token listings or platform parameter adjustments.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Proposals List */}
        <div className="space-y-6 lg:col-span-2">
          <h3 className="text-xl font-bold text-white mb-6">Active & Historic Proposals</h3>
          
          {proposals.map((proposal) => {
            const totalVotes = proposal.forVotes + proposal.againstVotes;
            const forPct = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 50;
            const againstPct = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 50;

            return (
              <div key={proposal.id} className="glass-panel p-6 rounded-3xl border border-glassBorder space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-web3TextSecondary font-semibold">Proposal #{proposal.id}</span>
                    <h4 className="text-base font-bold text-white mt-1 leading-relaxed">{proposal.description}</h4>
                    <p className="text-[11px] text-web3TextSecondary mt-1">Submitted by: {proposal.proposer}</p>
                  </div>

                  {/* State Pill */}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    proposal.state === 'Executed'
                      ? 'bg-web3Green/10 text-web3Green'
                      : proposal.state === 'Active'
                      ? 'bg-web3Blue/10 text-web3Blue'
                      : proposal.state === 'Defeated'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {proposal.state}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-web3Green">For: {proposal.forVotes.toLocaleString()} LAUNCH ({forPct.toFixed(1)}%)</span>
                    <span className="text-red-400">Against: {proposal.againstVotes.toLocaleString()} LAUNCH ({againstPct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-glassBorder flex">
                    <div className="bg-web3Green h-full" style={{ width: `${forPct}%` }}></div>
                    <div className="bg-red-400 h-full" style={{ width: `${againstPct}%` }}></div>
                  </div>
                </div>

                {/* Voter actions */}
                <div className="pt-2 flex space-x-2 justify-end">
                  {proposal.state === 'Active' && isConnected && (
                    <>
                      <button
                        onClick={() => handleVote(proposal.id, true)}
                        disabled={loading}
                        className="px-4 py-2 bg-web3Green/10 hover:bg-web3Green/20 text-web3Green text-xs font-bold rounded-xl border border-web3Green/20 transition-all duration-150"
                      >
                        Vote For
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, false)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-all duration-150"
                      >
                        Vote Against
                      </button>
                    </>
                  )}

                  {proposal.state === 'Succeeded' && (
                    <button
                      onClick={() => handleExecute(proposal.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-web3-gradient text-white text-xs font-bold rounded-xl shadow-neon-glow flex items-center space-x-1 transition-all duration-150"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Execute Proposal</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Proposal Form */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl h-fit">
          <h3 className="text-lg font-bold text-white border-b border-glassBorder pb-4 mb-6 flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-web3Blue" />
            <span>Create Proposal</span>
          </h3>

          <form onSubmit={handlePropose} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-web3TextSecondary mb-2">Proposal Description</label>
              <textarea
                rows={4}
                required
                value={newProposalText}
                onChange={(e) => setNewProposalText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm resize-none"
                placeholder="Submit listing candidates or modify treasury/staking parameters..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isConnected}
              className="w-full py-3 bg-web3Blue hover:opacity-90 active:scale-95 text-darkBg font-extrabold rounded-xl shadow-neon-glow flex items-center justify-center space-x-1.5 transition-all duration-150 text-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Submit Proposal</span>
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-glassBorder text-xs text-web3TextSecondary leading-relaxed">
            <strong>Requirements:</strong> Proposals require a minimum staking balance of 1,000 $LAUNCH to submit on-chain. Quorum checks require 4% participation to pass.
          </div>
        </div>

      </div>

    </div>
  );
}
