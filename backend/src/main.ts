import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

let server: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend integration
  app.enableCors({
    origin: '*', // In production, replace with specific frontend domains
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  if (process.env.VERCEL) {
    await app.init();
    return app.getHttpAdapter().getInstance();
  } else {
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`NestJS Token Launchpad API running on: http://localhost:${port}/api`);
  }
}

if (!process.env.VERCEL) {
  bootstrap();
}

export default async (req: any, res: any) => {
  if (!server) {
    server = await bootstrap();
  }
  // Strip '/api/backend' from the request URL so NestJS matches the route correctly (e.g. /api/auth/nonce)
  if (req.url && req.url.startsWith('/api/backend')) {
    req.url = req.url.replace('/api/backend', '/api');
  }
  return server(req, res);
};
