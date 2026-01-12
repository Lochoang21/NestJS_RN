import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from '../../users/entities/user.entity';
import { GroupMemberRole } from '../enums/group-member-role.enum';

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'group_id', type: 'bigint', unsigned: true })
  groupId: number;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: GroupMemberRole,
    default: GroupMemberRole.MEMBER,
  })
  role: GroupMemberRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;
}
