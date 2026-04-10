import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';
import { NotificationType } from './enums/notification-type.enum';
import { ReferenceType } from './enums/notification-type.enum';
import { NotificationRealtimeDto } from './dto/notification-realtime.dto';

type CreateNotificationParams = {
  userId: number;
  actorId: number;
  type: NotificationType;
  referenceId?: number;
  referenceType?: ReferenceType;
  content?: string;
};

@Injectable()
export class NotificationService {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_PAGE_SIZE = 10;
  private readonly MAX_PAGE_SIZE = 100;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async findByUser(userId: number, current = 1, pageSize = 10) {
    const {
      page: normalizedCurrent,
      size,
      skip,
    } = this.normalizePagination(current, pageSize);

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { userId, isDeleted: 0 },
      order: { createdAt: 'DESC' },
      skip,
      take: size,
      relations: ['actor'],
      select: {
        id: true,
        userId: true,
        actorId: true,
        type: true,
        referenceId: true,
        referenceType: true,
        content: true,
        isRead: true,
        createdAt: true,
        actor: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    });

    return {
      result: notifications.map((item) => this.toNotificationPayload(item)),
      total,
      totalPage: Math.ceil(total / size),
      current: normalizedCurrent,
      pageSize: size,
    };
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId, isDeleted: 0 },
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại');
    }

    if (notification.isRead) {
      return this.toNotificationPayload(notification);
    }

    notification.isRead = 1;
    const saved = await this.notificationRepo.save(notification);
    return this.toNotificationPayload(saved);
  }

  async markAllAsRead(userId: number) {
    const result = await this.notificationRepo.update(
      {
        userId,
        isRead: 0,
        isDeleted: 0,
      },
      { isRead: 1 },
    );

    return {
      updated: result.affected ?? 0,
    };
  }

  async createNotification({
    userId,
    actorId,
    type,
    referenceId,
    referenceType,
    content,
  }: CreateNotificationParams) {
    if (userId === actorId) {
      return null;
    }

    // 1. Save DB
    const notification = this.notificationRepo.create({
      userId,
      actorId,
      type,
      referenceId,
      referenceType,
      content,
    });

    const saved = await this.notificationRepo.save(notification);

    const detail = await this.notificationRepo.findOne({
      where: { id: saved.id },
      relations: ['actor'],
      select: {
        id: true,
        userId: true,
        actorId: true,
        type: true,
        referenceId: true,
        referenceType: true,
        content: true,
        isRead: true,
        createdAt: true,
        actor: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    });

    if (!detail) {
      return null;
    }

    const payload = this.toNotificationPayload(detail);

    // 2. Emit realtime
    this.notificationGateway.emitNotification(userId, payload);

    return payload;
  }

  private normalizePagination(current: number, pageSize: number) {
    const page =
      Number.isFinite(current) && current > 0
        ? Math.floor(current)
        : this.DEFAULT_PAGE;

    const size =
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(Math.floor(pageSize), this.MAX_PAGE_SIZE)
        : this.DEFAULT_PAGE_SIZE;

    return {
      page,
      size,
      skip: (page - 1) * size,
    };
  }

  private toNotificationPayload(
    notification: Notification,
  ): NotificationRealtimeDto {
    return {
      id: notification.id,
      userId: notification.userId,
      actorId: notification.actorId,
      type: notification.type,
      referenceId: notification.referenceId,
      referenceType: notification.referenceType,
      content: notification.content,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      actor: notification.actor
        ? {
            id: notification.actor.id,
            name: notification.actor.name,
            email: notification.actor.email,
            image: notification.actor.image,
          }
        : undefined,
    };
  }
}
