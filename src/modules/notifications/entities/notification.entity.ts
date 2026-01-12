import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { ReferenceType } from '../enums/notification-type.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'actor_id', type: 'bigint', unsigned: true })
  actorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    name: 'reference_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  referenceId: number | null;

  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: ReferenceType,
    nullable: true,
  })
  referenceType: ReferenceType | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'is_read', type: 'tinyint', default: 0 })
  isRead: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;
}
