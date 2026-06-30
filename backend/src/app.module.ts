import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { IndexerModule } from './indexer/indexer.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
    AnalyticsModule,
    IndexerModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
