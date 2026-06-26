import { Module } from '@nestjs/common';
import { ApiRoomModule } from '@quorum/api-room';
import { JiraImportController } from './jira-import.controller';
import { JiraImportService } from './jira-import.service';

@Module({
  imports: [ApiRoomModule],
  controllers: [JiraImportController],
  providers: [JiraImportService],
})
export class ApiJiraModule {}
