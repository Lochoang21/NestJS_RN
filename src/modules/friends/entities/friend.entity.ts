import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FriendStatus } from '../enums/friend-status.enum';

@Entity('friends')
export class Friend {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id_1', type: 'bigint', unsigned: true })
  userId1: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id_1' })
  user1: User;

  @Column({ name: 'user_id_2', type: 'bigint', unsigned: true })
  userId2: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id_2' })
  user2: User;

  @Column({
    type: 'enum',
    enum: FriendStatus,
    default: FriendStatus.PENDING,
  })
  status: FriendStatus;

  @Column({ name: 'action_user_id', type: 'bigint', unsigned: true })
  actionUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'action_user_id' })
  actionUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
