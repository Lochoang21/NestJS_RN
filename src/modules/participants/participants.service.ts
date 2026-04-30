import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationParticipant } from '@/modules/conversations/entities/conversation-participant.entity';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(ConversationParticipant)
    private readonly participantRepository: Repository<ConversationParticipant>,
  ) { }

  async ensureParticipant(conversationId: number, userId: number) {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId, isDeleted: 0 },
    });

    if (!participant) {
      throw new ForbiddenException('Not a conversation participant');
    }

    return participant;
  }

  async updateLastRead(
    conversationId: number,
    userId: number,
    seenAt: Date = new Date(),
  ) {
    await this.ensureParticipant(conversationId, userId);

    await this.participantRepository.update(
      { conversationId, userId },
      { lastReadAt: seenAt },
    );

    return { conversationId, userId, lastReadAt: seenAt };
  }
}
