import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Controller('sync')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post('sale')
  async cacheNewSale(
    @Body('saleAddress') saleAddress: string,
    @Body('ownerAddress') ownerAddress: string,
  ) {
    return this.indexerService.cacheSale(saleAddress, ownerAddress);
  }

  @Post('sale/:address')
  async syncSaleState(@Param('address') address: string) {
    return this.indexerService.syncSale(address);
  }
}
