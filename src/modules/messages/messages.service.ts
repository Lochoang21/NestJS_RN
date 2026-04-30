import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message, MessageType } from '@/modules/conversations/entities/message.entity';
import { Conversation } from '@/modules/conversations/entities/conversation.entity';
import { ConversationParticipant } from '@/modules/conversations/entities/conversation-participant.entity';
import { ConversationType } from '@/modules/conversations/enums/conversation-type.enum';
import { ParticipantsService } from '@/modules/participants/participants.service';

@Injectable()
export class MessagesService {
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly participantsService: ParticipantsService,
  ) { }

  async create(senderId: number, createMessageDto: CreateMessageDto) {
    await this.participantsService.ensureParticipant(
      createMessageDto.conversationId,
      senderId,
    );

    const messageType = createMessageDto.messageType ?? MessageType.TEXT;
    const content = createMessageDto.content?.trim() ?? null;

    if (messageType === MessageType.TEXT && !content) {
      throw new BadRequestException('Message content is required');
    }

    return this.messageRepository.manager.transaction(async (manager) => {
      const messageRepo = manager.getRepository(Message);
      const conversationRepo = manager.getRepository(Conversation);

      const conversation = await conversationRepo.findOne({
        where: { id: createMessageDto.conversationId, isDeleted: 0 },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const message = messageRepo.create({
        conversationId: createMessageDto.conversationId,
        senderId,
        messageType,
        content,
        replyToMessageId: createMessageDto.replyToMessageId ?? null,
      });

      const saved = await messageRepo.save(message);

      conversation.lastMessageId = saved.id;
      await conversationRepo.save(conversation);

      return saved;
    });
  }

  async getMessagesByConversation(
    conversationId: number,
    userId: number,
    limit = this.DEFAULT_LIMIT,
    cursor?: number,
  ) {
    await this.participantsService.ensureParticipant(conversationId, userId);

    return this.fetchMessagesByConversationId(conversationId, limit, cursor);
  }

  async getMessagesWithUser(
    currentUserId: number,
    otherUserId: number,
    limit = this.DEFAULT_LIMIT,
    cursor?: number,
  ) {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        ConversationParticipant,
        'participant1',
        'participant1.conversation_id = conversation.id AND participant1.user_id = :currentUserId AND participant1.is_deleted = 0',
        { currentUserId },
      )
      .innerJoin(
        ConversationParticipant,
        'participant2',
        'participant2.conversation_id = conversation.id AND participant2.user_id = :otherUserId AND participant2.is_deleted = 0',
        { otherUserId },
      )
      .where('conversation.conversation_type = :type', {
        type: ConversationType.ONE_TO_ONE,
      })
      .andWhere('conversation.is_deleted = 0')
      .getOne();

    if (!conversation) {
      return { conversationId: null, items: [], nextCursor: null };
    }

    const { items, nextCursor } = await this.fetchMessagesByConversationId(
      conversation.id,
      limit,
      cursor,
    );

    return { conversationId: conversation.id, items, nextCursor };
  }

  private async fetchMessagesByConversationId(
    conversationId: number,
    limit: number,
    cursor?: number,
  ) {
    const take = Math.min(Math.max(limit, 1), this.MAX_LIMIT);
    let cursorMessage: Message | null = null;

    if (cursor) {
      cursorMessage = await this.messageRepository.findOne({
        where: { id: cursor, conversationId, isDeleted: 0 },
      });

      if (!cursorMessage) {
        throw new BadRequestException('Invalid cursor');
      }
    }

    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversation_id = :conversationId', { conversationId })
      .andWhere('message.is_deleted = 0');

    if (cursorMessage) {
      query.andWhere(
        '(message.created_at < :cursorCreatedAt OR (message.created_at = :cursorCreatedAt AND message.id < :cursorId))',
        {
          cursorCreatedAt: cursorMessage.createdAt,
          cursorId: cursorMessage.id,
        },
      );
    }

    const messages = await query
      .orderBy('message.created_at', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(take + 1)
      .getMany();

    const hasNext = messages.length > take;
    const items = hasNext ? messages.slice(0, take) : messages;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }
}
