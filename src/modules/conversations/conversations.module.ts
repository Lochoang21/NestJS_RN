import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, ConversationParticipant]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
