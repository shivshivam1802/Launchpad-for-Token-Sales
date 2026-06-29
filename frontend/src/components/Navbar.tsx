'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, ChevronDown, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { launchpadApi } from '../app/api';

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [jwt, setJwt] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string>('NONE');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Check local storage for existing session
    const storedJwt = localStorage.getItem('jwt');
    const storedRole = localStorage.getItem('role');
    const storedKyc = localStorage.getItem('kycStatus');
    if (storedJwt) {
      setJwt(storedJwt);
      setUserRole(storedRole);
      setKycStatus(storedKyc || 'NONE');
    }
  }, []);

  const handleConnect = async () => {
    // Connect to first available connector (usually MetaMask)
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  // Trigger SIWE Signature Login when connected and JWT doesn't exist
  useEffect(() => {
    if (isConnected && address && !jwt) {
      triggerSIWE(address);
    }
  }, [isConnected, address]);

  const triggerSIWE = async (userAddress: string) => {
    try {
      console.log('Initiating SIWE authentication...');
      const nonce = await launchpadApi.getNonce(userAddress);
      
      // Request signature from user wallet via window.ethereum
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const message = `Sign in to Token Launchpad. Nonce: ${nonce}`;
        const signature = await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [message, userAddress],
        });

        const authResponse = await launchpadApi.login(userAddress, signature);
        
        localStorage.setItem('jwt', authResponse.accessToken);
        localStorage.setItem('role', authResponse.user.role);
        localStorage.setItem('kycStatus', authResponse.user.kycStatus);
        
        setJwt(authResponse.accessToken);
        setUserRole(authResponse.user.role);
        setKycStatus(authResponse.user.kycStatus);
        console.log('SIWE Auth success: JWT cached.');
      }
    } catch (error) {
      console.error('SIWE signature failed or cancelled:', error);
      disconnect();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('role');
    localStorage.removeItem('kycStatus');
    setJwt(null);
    setUserRole(null);
    setKycStatus('NONE');
    disconnect();
    setIsDropdownOpen(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Launch Sale', path: '/launch' },
    { name: 'Staking & Tiers', path: '/staking' },
    { name: 'Governance DAO', path: '/governance' },
    { name: 'Referrals', path: '/referral' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-glassBorder bg-[#0B0E14]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2 text-white font-extrabold text-xl tracking-tight">
              <span className="p-2 bg-web3-gradient rounded-xl shadow-neon-glow flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </span>
              <span>LAUNCH<span className="text-web3Blue">PAD</span></span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/5 text-web3Blue border-b-2 border-web3Blue'
                      : 'text-web3TextSecondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {/* Admin link if user is administrator */}
            {userRole === 'ADMIN' && (
              <Link
                href="/admin"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/admin'
                    ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500'
                    : 'text-red-400/80 hover:text-red-400 hover:bg-red-500/5'
                }`}
              >
                Admin Panel
              </Link>
            )}
          </div>

          {/* Web3 Wallet Action */}
          <div className="flex items-center space-x-4">
            {isConnected && address ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 bg-cardBg shadow-glass-inset border border-glassBorder hover:border-web3Blue/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-web3Green shadow-neon-green"></div>
                  <span>{formatAddress(address)}</span>
                  <ChevronDown className="w-4 h-4 text-web3TextSecondary" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass-panel rounded-2xl shadow-xl py-3 z-50">
                    <div className="px-4 py-2 border-b border-glassBorder pb-3 mb-2">
                      <p className="text-xs text-web3TextSecondary">Wallet Profile</p>
                      <p className="text-sm font-semibold text-white truncate">{address}</p>
                      
                      {/* KYC Status Pill */}
                      <div className="mt-2 flex items-center space-x-1.5">
                        {kycStatus === 'VERIFIED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-web3Green/10 text-web3Green">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            KYC Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                            KYC Unverified
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/5 transition-all duration-150 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect Wallet</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center space-x-2 bg-web3-gradient hover:opacity-90 active:scale-95 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-neon-glow transition-all duration-200"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
