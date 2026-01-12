import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';
import { ConversationParticipantRole } from '../enums/conversation-participant-role.enum';

@Entity('conversation_participants')
export class ConversationParticipant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'conversation_id', type: 'bigint', unsigned: true })
  conversationId: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ConversationParticipantRole,
    default: ConversationParticipantRole.MEMBER,
  })
  role: ConversationParticipantRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'last_read_at', type: 'timestamp', nullable: true })
  lastReadAt: Date | null;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date | null;
}
