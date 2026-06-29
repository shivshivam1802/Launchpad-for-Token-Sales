import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Web3 IDO/ICO Token Launchpad Platform',
  description: 'Launch decentralized tokens, raise secure capital, and claim rewards on a premium glassmorphic launch platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-darkBg text-white">
        <Providers>
          <Navbar />
          <div className="pt-20">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
