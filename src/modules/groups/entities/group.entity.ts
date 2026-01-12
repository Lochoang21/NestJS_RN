import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum GroupPrivacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SECRET = 'secret',
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true })
  coverUrl: string | null;

  @Column({ name: 'created_by', type: 'bigint', unsigned: true })
  createdById: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({
    type: 'enum',
    enum: GroupPrivacy,
    default: GroupPrivacy.PUBLIC,
  })
  privacy: GroupPrivacy;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
