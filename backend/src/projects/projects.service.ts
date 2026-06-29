import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, data: any) {
    return this.prisma.project.create({
      data: {
        ownerId,
        name: data.name,
        ticker: data.ticker,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        description: data.description,
        whitepaperUrl: data.whitepaperUrl,
        tokenomics: data.tokenomics,
        roadmap: data.roadmap,
        team: data.team,
        websiteUrl: data.websiteUrl,
        twitterUrl: data.twitterUrl,
        telegramUrl: data.telegramUrl,
        githubUrl: data.githubUrl,
        auditUrl: data.auditUrl,
        status: ProjectStatus.PENDING,
      },
    });
  }

  async findAll(status?: ProjectStatus) {
    return this.prisma.project.findMany({
      where: status ? { status } : {},
      include: {
        owner: {
          select: {
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            walletAddress: true,
          },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async findByOwner(ownerId: string) {
    return this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: ProjectStatus) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return this.prisma.project.update({
      where: { id },
      data: { status },
    });
  }

  async linkContractAddress(id: string, ownerId: string, contractAddress: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('Not the project owner');
    }
    return this.prisma.project.update({
      where: { id },
      data: { contractAddress: contractAddress.toLowerCase() },
    });
  }
}
