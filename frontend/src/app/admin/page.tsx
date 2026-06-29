'use client';

import React, { useState, useEffect } from 'react';
import { launchpadApi, ProjectData } from '../api';
import { ShieldCheck, ShieldAlert, Award, Rocket, Check, X, Users, Settings } from 'lucide-react';

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [pendingProjects, setPendingProjects] = useState<ProjectData[]>([]);
  const [approvedProjects, setApprovedProjects] = useState<ProjectData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [kycWallet, setKycWallet] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    const role = localStorage.getItem('role');
    
    if (token && role === 'ADMIN') {
      setJwt(token);
      setIsAdmin(true);
      loadAdminData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const loadAdminData = async (token: string) => {
    try {
      const allProjects = await launchpadApi.getProjects();
      setPendingProjects(allProjects.filter(p => p.status === 'PENDING'));
      setApprovedProjects(allProjects.filter(p => p.status === 'APPROVED'));
      
      // Mock user database representation
      setUsers([
        { id: 'u1', walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', role: 'ADMIN', kycStatus: 'VERIFIED' },
        { id: 'u2', walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', role: 'USER', kycStatus: 'NONE' },
        { id: 'u3', walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', role: 'USER', kycStatus: 'PENDING' },
      ]);
    } catch (err) {
      console.error('Failed to load admin panel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (projectId: string) => {
    if (!jwt) return;
    try {
      await launchpadApi.updateProjectStatus(jwt, projectId, 'APPROVED');
      setStatusMsg({ type: 'success', text: 'Project application approved successfully!' });
      loadAdminData(jwt);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Status update failed.' });
    }
  };

  const handleReject = async (projectId: string) => {
    if (!jwt) return;
    try {
      await launchpadApi.updateProjectStatus(jwt, projectId, 'REJECTED');
      setStatusMsg({ type: 'success', text: 'Project application rejected.' });
      loadAdminData(jwt);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Status update failed.' });
    }
  };

  const handleApproveKYC = async (walletAddress: string) => {
    if (!jwt) return;
    // Simulate updating user KYC state in database
    const updated = users.map(u => 
      u.walletAddress.toLowerCase() === walletAddress.toLowerCase() 
        ? { ...u, kycStatus: 'VERIFIED' } 
        : u
    );
    setUsers(updated);
    setStatusMsg({ type: 'success', text: `KYC approved for wallet: ${walletAddress}` });
    setKycWallet('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-web3Blue"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto shadow-lg p-2 bg-red-500/10 rounded-2xl animate-pulse" />
        <h2 className="text-2xl font-bold text-white">Access Prohibited</h2>
        <p className="text-web3TextSecondary text-sm">
          This dashboard requires administrator signature verification. Please connect with an authorized administrator wallet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Top Banner */}
      <div className="flex items-center space-x-3 pb-6 border-b border-glassBorder">
        <div className="p-3 bg-red-500/10 rounded-2xl shadow-lg border border-red-500/25">
          <Settings className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Launchpad Administrative Dashboard</h2>
          <p className="text-xs text-web3TextSecondary mt-0.5">Approve launch candidate details and process whitelists/KYC audits.</p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 text-sm max-w-3xl ${
          statusMsg.type === 'success' ? 'bg-web3Green/10 text-web3Green border border-web3Green/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Projects Approval List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white">Pending Applications ({pendingProjects.length})</h3>
          
          {pendingProjects.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl text-xs text-web3TextSecondary border-dashed border-glassBorder border">
              No pending listings currently awaiting review.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingProjects.map((project) => (
                <div key={project.id} className="glass-panel p-6 rounded-2xl border border-glassBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-white text-base">{project.name} ({project.ticker})</h4>
                    <p className="text-xs text-web3TextSecondary mt-1 leading-relaxed max-w-md">{project.description}</p>
                    <p className="text-[10px] text-web3Blue mt-2 font-mono">Owner Wallet: {project.owner?.walletAddress}</p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(project.id!)}
                      className="px-3.5 py-2 bg-web3Green/15 hover:bg-web3Green/25 text-web3Green text-xs font-bold rounded-xl border border-web3Green/20 flex items-center space-x-1 transition-all duration-150"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(project.id!)}
                      className="px-3.5 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 flex items-center space-x-1 transition-all duration-150"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-lg font-bold text-white pt-6">Approved Listed Projects ({approvedProjects.length})</h3>
          <div className="space-y-4">
            {approvedProjects.map((project) => (
              <div key={project.id} className="glass-panel p-5 rounded-2xl border border-glassBorder flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-white">{project.name}</h4>
                  <p className="text-web3TextSecondary font-mono mt-0.5">{project.contractAddress ? `Pool: ${project.contractAddress}` : 'Pending Smart Contract Deployment'}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-web3Green/10 text-web3Green font-semibold">Active IDO</span>
              </div>
            ))}
          </div>
        </div>

        {/* KYC Management Panel */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl h-fit space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-glassBorder pb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-web3Blue" />
            <span>KYC Verification Panel</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-web3TextSecondary mb-2">User Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={kycWallet}
                onChange={(e) => setKycWallet(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-mono"
              />
            </div>

            <button
              onClick={() => handleApproveKYC(kycWallet)}
              disabled={!kycWallet}
              className="w-full py-3 bg-web3Blue text-darkBg font-extrabold rounded-xl shadow-neon-glow hover:opacity-90 active:scale-95 transition-all duration-150 text-xs"
            >
              Approve KYC Status
            </button>
          </div>

          <div className="pt-4 border-t border-glassBorder">
            <h4 className="text-xs font-bold text-white mb-3">Audited Registry Profile</h4>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex justify-between items-center text-[10px] p-2 bg-white/5 border border-glassBorder rounded-lg">
                  <span className="font-mono text-web3TextSecondary">{u.walletAddress.substring(0, 15)}...</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    u.kycStatus === 'VERIFIED' ? 'bg-web3Green/10 text-web3Green' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {u.kycStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
