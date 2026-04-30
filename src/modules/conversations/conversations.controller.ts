/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { ResponseMessage } from '@/decorator/customize';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Create conversation successfully')
  create(@Body() createConversationDto: CreateConversationDto, @Request() req) {
    return this.conversationsService.create(createConversationDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get conversations successfully')
  findAll(@Request() req) {
    return this.conversationsService.findAll(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get conversation successfully')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.conversationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Update conversation successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConversationDto: UpdateConversationDto,
    @Request() req,
  ) {
    return this.conversationsService.update(
      id,
      updateConversationDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Remove conversation successfully')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.conversationsService.remove(id, req.user.id);
  }
}
