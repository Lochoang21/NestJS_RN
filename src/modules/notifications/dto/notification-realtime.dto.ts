import {
  NotificationType,
  ReferenceType,
} from '../enums/notification-type.enum';

export type NotificationActorDto = {
  id: number;
  name: string;
  email: string;
  image: string | null;
};

export type NotificationRealtimeDto = {
  id: number;
  userId: number;
  actorId: number;
  type: NotificationType;
  referenceId: number | null;
  referenceType: ReferenceType | null;
  content: string | null;
  isRead: number;
  createdAt: Date;
  actor?: NotificationActorDto;
};
