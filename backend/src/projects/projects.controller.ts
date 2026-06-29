import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtGuard } from '../auth/jwt.guard';
import { ProjectStatus } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtGuard)
  async create(@Request() req: any, @Body() data: any) {
    return this.projectsService.create(req.user.sub, data);
  }

  @Get()
  async findAll(@Query('status') status?: ProjectStatus) {
    return this.projectsService.findAll(status);
  }

  @Get('owner')
  @UseGuards(JwtGuard)
  async findByOwner(@Request() req: any) {
    return this.projectsService.findByOwner(req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard)
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: ProjectStatus,
  ) {
    // Basic verification: Check if current user is admin
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized role change access');
    }
    return this.projectsService.updateStatus(id, status);
  }

  @Patch(':id/link-contract')
  @UseGuards(JwtGuard)
  async linkContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body('contractAddress') contractAddress: string,
  ) {
    return this.projectsService.linkContractAddress(id, req.user.sub, contractAddress);
  }
}
