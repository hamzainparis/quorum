import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ApiRoomModule } from '@quorum/api-room';
import { ApiAuthModule } from '@quorum/api-auth';
import { ApiJiraModule } from '@quorum/api-jira';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Serves the Angular production build so the API and frontend can be deployed
    // as a single Render service on one origin (avoids cross-origin WebSocket setup).
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'quorum-web', 'browser'),
      exclude: ['/api/{*splat}', '/socket.io/{*splat}'],
    }),
    ApiRoomModule,
    ApiAuthModule,
    ApiJiraModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
