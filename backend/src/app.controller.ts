import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Token Launchpad REST API is online',
      timestamp: new Date().toISOString(),
    };
  }
}
