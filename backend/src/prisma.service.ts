import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Successfully connected to database via Prisma.');
    } catch (err: any) {
      console.error('Failed to connect to database during Prisma initialization:', err.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
