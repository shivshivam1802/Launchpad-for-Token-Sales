import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
    AnalyticsModule,
    IndexerModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
