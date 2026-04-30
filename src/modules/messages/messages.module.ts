import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message } from '@/modules/conversations/entities/message.entity';
import { Conversation } from '@/modules/conversations/entities/conversation.entity';
import { ParticipantsModule } from '@/modules/participants/participants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Conversation]),
    ParticipantsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule { }
