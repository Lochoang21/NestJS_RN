/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { ResponseMessage } from '@/decorator/customize';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Get('conversation/:id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get conversation messages successfully')
  findByConversation(
    @Param('id', ParseIntPipe) conversationId: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor: string | undefined,
    @Request() req,
  ) {
    const cursorId = cursor ? Number(cursor) : undefined;
    if (cursorId !== undefined && Number.isNaN(cursorId)) {
      throw new BadRequestException('Invalid cursor');
    }
    return this.messagesService.getMessagesByConversation(
      conversationId,
      req.user.id,
      limit,
      cursorId,
    );
  }

  @Get('with/:userId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get user message history successfully')
  findWithUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor: string | undefined,
    @Request() req,
  ) {
    const cursorId = cursor ? Number(cursor) : undefined;
    if (cursorId !== undefined && Number.isNaN(cursorId)) {
      throw new BadRequestException('Invalid cursor');
    }

    return this.messagesService.getMessagesWithUser(
      req.user.id,
      userId,
      limit,
      cursorId,
    );
  }
}
