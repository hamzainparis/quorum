import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ImportTicketsResult,
  JiraImportPayload,
  JiraSearchPayload,
  JiraSearchResult,
  JiraStoryPointsPayload,
  JiraStoryPointsResult,
} from '@quorum/shared-domain';
import { RoomNotFoundError } from '@quorum/api-room';
import { JiraAuthError, JiraRequestError, JiraUnreachableError } from './jira-errors';
import { JiraImportService } from './jira-import.service';

const CREDENTIAL_FIELDS = ['siteUrl', 'email', 'apiToken'] as const;
const IMPORT_REQUIRED_FIELDS: (keyof JiraImportPayload)[] = [
  'roomCode',
  'clientId',
  ...CREDENTIAL_FIELDS,
];

@Controller('jira')
export class JiraImportController {
  constructor(private readonly jiraImport: JiraImportService) {}

  @Post('import')
  async import(@Body() body: JiraImportPayload): Promise<ImportTicketsResult> {
    this.requireStrings(body, IMPORT_REQUIRED_FIELDS);
    return this.run(() => this.jiraImport.import(body));
  }

  @Post('search')
  async search(@Body() body: JiraSearchPayload): Promise<JiraSearchResult> {
    this.requireStrings(body, [...CREDENTIAL_FIELDS, 'query']);
    return this.run(() => this.jiraImport.search(body));
  }

  @Post('story-points')
  async setStoryPoints(@Body() body: JiraStoryPointsPayload): Promise<JiraStoryPointsResult> {
    this.requireStrings(body, [...CREDENTIAL_FIELDS, 'issueKey']);
    if (body.points != null && typeof body.points !== 'number') {
      throw new BadRequestException('points must be a number or null');
    }
    return this.run(() => this.jiraImport.setStoryPoints(body));
  }

  private requireStrings<T>(body: T, fields: (keyof T)[]): void {
    for (const field of fields) {
      if (!body?.[field] || typeof body[field] !== 'string') {
        throw new BadRequestException(`${String(field)} is required`);
      }
    }
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RoomNotFoundError) throw new NotFoundException(err.message);
      if (err instanceof JiraAuthError) throw new UnauthorizedException(err.message);
      if (err instanceof JiraUnreachableError) throw new BadGatewayException(err.message);
      if (err instanceof JiraRequestError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}
