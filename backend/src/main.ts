import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';
import 'source-map-support/register';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.useStaticAssets(`${__dirname}/public`);
  // the next two lines did the trick
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
  app.enableCors();
  await app.listen(4000);
}
bootstrap();
// just to test the github workflow
