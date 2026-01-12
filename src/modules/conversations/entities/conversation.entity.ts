import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ConversationType } from '../enums/conversation-type.enum';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({
    name: 'conversation_type',
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.ONE_TO_ONE,
  })
  conversationType: ConversationType;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @Column({
    name: 'last_message_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  lastMessageId: number | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_message_id' })
  lastMessage: Message | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
