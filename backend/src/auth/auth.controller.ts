import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('nonce')
  async getNonce(@Query('walletAddress') walletAddress: string) {
    return this.authService.getNonce(walletAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body('walletAddress') walletAddress: string,
    @Body('signature') signature: string,
  ) {
    return this.authService.login(walletAddress, signature);
  }
}
