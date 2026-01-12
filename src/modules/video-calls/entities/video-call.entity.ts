import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum VideoCallType {
  ONE_TO_ONE = 'one_to_one',
  GROUP = 'group',
}

export enum VideoCallStatus {
  INITIATED = 'initiated',
  ONGOING = 'ongoing',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

@Entity('video_calls')
export class VideoCall {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'call_id', type: 'varchar', length: 100 })
  callId: string;

  @Column({ name: 'initiator_id', type: 'bigint', unsigned: true })
  initiatorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiator_id' })
  initiator: User;

  @Column({
    name: 'call_type',
    type: 'enum',
    enum: VideoCallType,
    default: VideoCallType.ONE_TO_ONE,
  })
  callType: VideoCallType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: VideoCallStatus,
    default: VideoCallStatus.INITIATED,
  })
  status: VideoCallStatus;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'duration_seconds', type: 'int', unsigned: true, default: 0 })
  durationSeconds: number;
}
