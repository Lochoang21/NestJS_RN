import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  AUDIO = 'audio',
  STICKER = 'sticker',
  LINK = 'link',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'conversation_id', type: 'bigint', unsigned: true })
  conversationId: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'sender_id', type: 'bigint', unsigned: true })
  senderId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({
    name: 'reply_to_message_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  replyToMessageId: number | null;

  @ManyToOne(() => Message, (message) => message.replies, { nullable: true })
  @JoinColumn({ name: 'reply_to_message_id' })
  replyTo: Message | null;

  @OneToMany(() => Message, (message) => message.replyTo)
  replies: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
