import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { ConversationParticipantRole } from './enums/conversation-participant-role.enum';
import { ConversationType } from './enums/conversation-type.enum';
import { Message } from './entities/message.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepository: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) { }

  async create(createConversationDto: CreateConversationDto, userId: number) {
    const participantIds = Array.from(
      new Set([userId, ...(createConversationDto.participantIds ?? [])]),
    );

    if (participantIds.length < 2) {
      throw new BadRequestException('Conversation must have at least 2 users');
    }

    const conversationType =
      createConversationDto.conversationType ??
      (participantIds.length > 2
        ? ConversationType.GROUP
        : ConversationType.ONE_TO_ONE);

    return this.conversationRepository.manager.transaction(
      async (manager) => {
        const conversationRepo = manager.getRepository(Conversation);
        const participantRepo = manager.getRepository(ConversationParticipant);

        const conversation = conversationRepo.create({
          conversationType,
          name: createConversationDto.name ?? null,
          avatarUrl: createConversationDto.avatarUrl ?? null,
          createdById: userId,
        });

        const savedConversation = await conversationRepo.save(conversation);

        const participants = participantIds.map((participantId) =>
          participantRepo.create({
            conversationId: savedConversation.id,
            userId: participantId,
            role:
              participantId === userId
                ? ConversationParticipantRole.ADMIN
                : ConversationParticipantRole.MEMBER,
          }),
        );

        await participantRepo.save(participants);

        return savedConversation;
      },
    );
  }

  async findAll(userId: number) {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        ConversationParticipant,
        'participant',
        'participant.conversation_id = conversation.id AND participant.user_id = :userId AND participant.is_deleted = 0',
        { userId },
      )
      .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
      .where('conversation.is_deleted = 0')
      .orderBy(
        'COALESCE(lastMessage.created_at, conversation.created_at)',
        'DESC',
      )
      .getMany();
  }

  async findOne(id: number, userId: number) {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        ConversationParticipant,
        'participant',
        'participant.conversation_id = conversation.id AND participant.user_id = :userId AND participant.is_deleted = 0',
        { userId },
      )
      .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
      .where('conversation.id = :id', { id })
      .andWhere('conversation.is_deleted = 0')
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async update(
    id: number,
    updateConversationDto: UpdateConversationDto,
    userId: number,
  ) {
    const participant = await this.participantRepository.findOne({
      where: { conversationId: id, userId, isDeleted: 0 },
    });

    if (!participant) {
      throw new ForbiddenException('Not a conversation participant');
    }

    const updatePayload: Partial<Conversation> = {};

    if (updateConversationDto.name !== undefined) {
      updatePayload.name = updateConversationDto.name;
    }

    if (updateConversationDto.avatarUrl !== undefined) {
      updatePayload.avatarUrl = updateConversationDto.avatarUrl;
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.conversationRepository.update(id, updatePayload);
    }

    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number) {
    const participant = await this.participantRepository.findOne({
      where: { conversationId: id, userId, isDeleted: 0 },
    });

    if (!participant) {
      throw new ForbiddenException('Not a conversation participant');
    }

    await this.conversationRepository.update(id, {
      isDeleted: 1,
      deletedAt: new Date(),
    });

    await this.messageRepository.update(
      { conversationId: id },
      { isDeleted: 1, deletedAt: new Date() },
    );

    return { id };
  }
}
