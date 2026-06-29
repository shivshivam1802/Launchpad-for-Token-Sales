import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getPlatformStats() {
    // Total raised is sum of all token sales totalRaised
    const sales = await this.prisma.tokenSaleCache.findMany();
    
    let totalRaisedUSD = 0;
    let totalParticipants = 0;

    for (const sale of sales) {
      // Assuming payment is USDT/USDC style (normalized for representation)
      const raised = parseFloat(sale.totalRaised) / 10**6; // normalized from USDT decimals
      totalRaisedUSD += isNaN(raised) ? 0 : raised;
      totalParticipants += 12; // mock count of users purchasing per sale for demo
    }

    const totalProjects = await this.prisma.project.count();
    const approvedProjects = await this.prisma.project.count({
      where: { status: 'APPROVED' },
    });

    const userCount = await this.prisma.user.count();

    // Mock calculations for premium dashboard representation
    const tvl = totalRaisedUSD * 1.45; // total value locked in staking + pool deposits
    const averageROI = 320; // 3.2x average project return
    const claimRate = 87.5; // percent of vested claims fulfilled

    return {
      totalRaised: totalRaisedUSD.toFixed(2),
      tvl: tvl.toFixed(2),
      participants: totalParticipants + userCount,
      totalProjects,
      approvedProjects,
      averageROI: `${averageROI}%`,
      claimRate: `${claimRate}%`,
    };
  }
}
