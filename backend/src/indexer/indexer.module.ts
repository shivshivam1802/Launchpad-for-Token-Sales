import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { IndexerController } from './indexer.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [IndexerController],
  providers: [IndexerService, PrismaService],
  exports: [IndexerService],
})
export class IndexerModule {}
