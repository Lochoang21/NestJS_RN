import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsService } from './participants.service';
import { ConversationParticipant } from '@/modules/conversations/entities/conversation-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationParticipant])],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule { }
