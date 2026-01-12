import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GroupPost } from './group-post.entity';
import { User } from '../../users/entities/user.entity';

@Entity('group_comments')
export class GroupComment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'group_post_id', type: 'bigint', unsigned: true })
  groupPostId: number;

  @ManyToOne(() => GroupPost, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_post_id' })
  groupPost: GroupPost;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'parent_comment_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  parentCommentId: number | null;

  @ManyToOne(() => GroupComment, (comment) => comment.replies, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment: GroupComment | null;

  @OneToMany(() => GroupComment, (comment) => comment.parentComment)
  replies: GroupComment[];

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
