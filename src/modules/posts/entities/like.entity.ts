import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LikeableType } from '../enums/likeable-type.enum';

@Entity('likes')
export class Like {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User, (user) => user.likes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'likeable_id', type: 'bigint', unsigned: true })
  likeableId: number;

  @Column({
    name: 'likeable_type',
    type: 'enum',
    enum: LikeableType,
  })
  likeableType: LikeableType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
