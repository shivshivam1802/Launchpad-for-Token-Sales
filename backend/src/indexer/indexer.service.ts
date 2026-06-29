import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ethers } from 'ethers';

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private factoryContract: ethers.Contract | null = null;

  // Local hardhat factory contract address
  private factoryAddress = process.env.FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  // ABIs
  private factoryAbi = [
    'event SaleCreated(address indexed saleAddress, address indexed projectOwner, address indexed saleToken, address acceptedToken, uint256 hardCap, uint256 startTime)',
  ];

  private saleAbi = [
    'event Purchased(address indexed buyer, uint256 amountPaid, uint256 tokensBought, address indexed referrer)',
    'event SaleFinalized(uint256 totalRaised, uint256 platformFee, uint256 projectOwnerShare)',
    'event StateChanged(uint8 newState)',
    'function config() external view returns (address saleToken, address acceptedToken, uint256 rate, uint256 softCap, uint256 hardCap, uint256 minBuy, uint256 maxBuy, uint256 startTime, uint256 endTime, bool useTiers)',
    'function totalRaised() external view returns (uint256)',
    'function totalTokensSold() external view returns (uint256)',
    'function state() external view returns (uint8)',
  ];

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.initializeIndexer();
  }

  private async initializeIndexer() {
    const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
    this.logger.log(`Connecting to EVM network at: ${rpcUrl}`);

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test provider connection
      await this.provider.getNetwork();
      this.logger.log('Connected to EVM Blockchain Node.');

      this.factoryContract = new ethers.Contract(this.factoryAddress, this.factoryAbi, this.provider);
      
      // Start listening to events
      this.startListening();
      
      // Sync past sales
      await this.syncAllPastSales();
    } catch (error) {
      this.logger.warn(`Blockchain Indexer failed to start: ${error.message}. Caching functions remain available via client API.`);
    }
  }

  private startListening() {
    if (!this.factoryContract) return;

    this.logger.log('Listening for on-chain SaleCreated events...');
    this.factoryContract.on('SaleCreated', async (saleAddress, projectOwner, saleToken, acceptedToken, hardCap, startTime, event) => {
      this.logger.log(`New token sale detected at ${saleAddress}`);
      await this.cacheSale(saleAddress, projectOwner);
    });
  }

  private async syncAllPastSales() {
    this.logger.log('Synchronizing historical token sales...');
    // We can also let the API do manual triggers. Let's make an endpoint for manually sync'ing sales.
  }

  public async cacheSale(saleAddress: string, ownerAddress: string) {
    if (!this.provider) return;

    try {
      const saleContract = new ethers.Contract(saleAddress, this.saleAbi, this.provider);
      const conf = await saleContract.config();
      const totalRaised = await saleContract.totalRaised();
      const totalTokensSold = await saleContract.totalTokensSold();
      const stateId = await saleContract.state();

      const states = ['Active', 'Paused', 'Success', 'Failed', 'Cancelled'];
      const state = states[Number(stateId)] || 'Active';

      const cache = await this.prisma.tokenSaleCache.upsert({
        where: { address: saleAddress.toLowerCase() },
        create: {
          address: saleAddress.toLowerCase(),
          ownerAddress: ownerAddress.toLowerCase(),
          saleToken: conf.saleToken.toLowerCase(),
          acceptedToken: conf.acceptedToken.toLowerCase(),
          rate: conf.rate.toString(),
          softCap: conf.softCap.toString(),
          hardCap: conf.hardCap.toString(),
          minBuy: conf.minBuy.toString(),
          maxBuy: conf.maxBuy.toString(),
          startTime: new Date(Number(conf.startTime) * 1000),
          endTime: new Date(Number(conf.endTime) * 1000),
          totalRaised: totalRaised.toString(),
          totalTokensSold: totalTokensSold.toString(),
          state,
        },
        update: {
          totalRaised: totalRaised.toString(),
          totalTokensSold: totalTokensSold.toString(),
          state,
        },
      });

      // Update project listing status if matching ticker/owner
      await this.prisma.project.updateMany({
        where: {
          owner: {
            walletAddress: ownerAddress.toLowerCase(),
          },
          contractAddress: null,
        },
        data: {
          contractAddress: saleAddress.toLowerCase(),
          status: 'APPROVED',
        },
      });

      this.logger.log(`Synced TokenSale cache for: ${saleAddress}`);
      return cache;
    } catch (err) {
      this.logger.error(`Error caching sale address ${saleAddress}: ${err.message}`);
    }
  }

  // Sync details for a single sale
  public async syncSale(saleAddress: string) {
    if (!this.provider) return;
    try {
      const saleContract = new ethers.Contract(saleAddress, this.saleAbi, this.provider);
      const totalRaised = await saleContract.totalRaised();
      const totalTokensSold = await saleContract.totalTokensSold();
      const stateId = await saleContract.state();

      const states = ['Active', 'Paused', 'Success', 'Failed', 'Cancelled'];
      const state = states[Number(stateId)] || 'Active';

      return this.prisma.tokenSaleCache.update({
        where: { address: saleAddress.toLowerCase() },
        data: {
          totalRaised: totalRaised.toString(),
          totalTokensSold: totalTokensSold.toString(),
          state,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to sync sale state: ${error.message}`);
    }
  }
}
