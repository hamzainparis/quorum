import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ImportTicketsResult, JiraImportPayload } from '@quorum/shared-domain';
import { RoomNotFoundError } from '@quorum/api-room';
import { JiraAuthError, JiraRequestError, JiraUnreachableError } from './jira-errors';
import { JiraImportService } from './jira-import.service';

const REQUIRED_FIELDS: (keyof JiraImportPayload)[] = [
  'roomCode',
  'clientId',
  'siteUrl',
  'email',
  'apiToken',
];

@Controller('jira')
export class JiraImportController {
  constructor(private readonly jiraImport: JiraImportService) {}

  @Post('import')
  async import(@Body() body: JiraImportPayload): Promise<ImportTicketsResult> {
    for (const field of REQUIRED_FIELDS) {
      if (!body?.[field] || typeof body[field] !== 'string') {
        throw new BadRequestException(`${field} is required`);
      }
    }

    try {
      return await this.jiraImport.import(body);
    } catch (err) {
      if (err instanceof RoomNotFoundError) throw new NotFoundException(err.message);
      if (err instanceof JiraAuthError) throw new UnauthorizedException(err.message);
      if (err instanceof JiraUnreachableError) throw new BadGatewayException(err.message);
      if (err instanceof JiraRequestError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}
