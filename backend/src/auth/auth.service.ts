import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async getNonce(walletAddress: string) {
    const address = walletAddress.toLowerCase();
    const nonce = Math.floor(Math.random() * 1000000).toString();

    // Create user if not exists, or update existing nonce
    const user = await this.prisma.user.upsert({
      where: { walletAddress: address },
      create: {
        walletAddress: address,
        nonce,
      },
      update: {
        nonce,
      },
    });

    return { nonce: user.nonce };
  }

  async login(walletAddress: string, signature: string) {
    const address = walletAddress.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Request a nonce first.');
    }

    const message = `Sign in to Token Launchpad. Nonce: ${user.nonce}`;
    
    try {
      // Recover signer address from signature and message
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== address) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Generate next random nonce to prevent replay attacks
      const nextNonce = Math.floor(Math.random() * 1000000).toString();
      await this.prisma.user.update({
        where: { walletAddress: address },
        data: { nonce: nextNonce },
      });

      // Generate JWT
      const payload = { sub: user.id, walletAddress: user.walletAddress, role: user.role };
      const token = this.jwtService.sign(payload);

      return {
        accessToken: token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          role: user.role,
          kycStatus: user.kycStatus,
          kycVerified: user.kycVerified,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Signature verification failed');
    }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
