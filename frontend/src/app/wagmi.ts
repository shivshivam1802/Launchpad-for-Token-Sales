import { http, createConfig } from 'wagmi';
import { mainnet, polygon, bsc, arbitrum, base, hardhat } from 'wagmi/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [hardhat, mainnet, polygon, bsc, arbitrum, base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Token Launchpad' }),
  ],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
});
