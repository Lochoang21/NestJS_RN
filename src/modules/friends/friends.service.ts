import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFriendDto } from './dto/create-friend.dto';
import { QueryFriendDto } from './dto/query-friend.dto';
import { Friend } from './entities/friend.entity';
import { FriendStatus } from './enums/friend-status.enum';
import { FriendsGateway } from './friends-gateway';
import { UsersService } from '../users/users.service';
import {
  PaginatedFriends,
  PendingRequestItem,
} from './interfaces/friend.interface';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,

    // Fix #3: Dùng UsersService thay vì inject trực tiếp UserRepository
    // UsersModule phải export UsersService để dùng được ở đây
    private readonly usersService: UsersService,

    private readonly friendsGateway: FriendsGateway,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Normalize thứ tự userId để đảm bảo constraint unique trong DB.
   * Luôn giữ userId nhỏ hơn ở vị trí userId1.
   */
  private normalizeUserIds(
    a: number,
    b: number,
  ): { userId1: number; userId2: number } {
    return a < b ? { userId1: a, userId2: b } : { userId1: b, userId2: a };
  }

  /**
   * Lấy friendId của người còn lại trong cặp quan hệ.
   */
  private getOtherId(record: Friend, currentUserId: number): number {
    return record.userId1 === currentUserId ? record.userId2 : record.userId1;
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  async createRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;

    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        'Bạn không thể gửi lời mời kết bạn cho chính mình',
      );
    }

    // Fix #3: Dùng UsersService.findOne thay vì query trực tiếp UserRepository
    await this.usersService.findOne(targetUserId);

    const { userId1, userId2 } = this.normalizeUserIds(
      currentUserId,
      targetUserId,
    );

    // Fix #7: Wrap toàn bộ logic đọc-ghi trong transaction để đảm bảo
    // DB và WebSocket event luôn consistent với nhau
    return this.friendRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Friend);

      const existing = await repo.findOne({ where: { userId1, userId2 } });

      if (existing) {
        if (existing.status === FriendStatus.ACCEPTED) {
          throw new BadRequestException('Hai người đã là bạn bè');
        }

        if (existing.status === FriendStatus.PENDING) {
          // Người kia đã gửi trước → gửi chéo → tự động accept
          if (existing.actionUserId !== currentUserId) {
            existing.status = FriendStatus.ACCEPTED;
            existing.actionUserId = currentUserId;
            const saved = await repo.save(existing);

            this.friendsGateway.emitFriendRequestAccepted(targetUserId, {
              friendId: saved.id,
              userId1: saved.userId1,
              userId2: saved.userId2,
              status: saved.status,
              updatedAt: saved.updatedAt,
            });

            return saved;
          }
          // Mình đã gửi rồi → không cho gửi lại
          throw new BadRequestException('Lời mời kết bạn đang chờ xử lý');
        }

        // UNFRIENDED hoặc CANCELLED → cho phép gửi lại
        if (
          existing.status === FriendStatus.UNFRIENDED ||
          existing.status === FriendStatus.CANCELLED
        ) {
          existing.status = FriendStatus.PENDING;
          existing.actionUserId = currentUserId;
          const saved = await repo.save(existing);

          this.friendsGateway.emitFriendRequestCreated(targetUserId, {
            friendId: saved.id,
            fromUserId: currentUserId,
            toUserId: targetUserId,
            status: saved.status,
            createdAt: saved.createdAt,
          });

          return saved;
        }

        throw new BadRequestException('Không thể gửi lời mời kết bạn');
      }

      // Chưa có record → tạo mới
      const friend = repo.create({
        userId1,
        userId2,
        status: FriendStatus.PENDING,
        actionUserId: currentUserId,
      });

      const saved = await repo.save(friend);

      this.friendsGateway.emitFriendRequestCreated(targetUserId, {
        friendId: saved.id,
        fromUserId: currentUserId,
        toUserId: targetUserId,
        status: saved.status,
        createdAt: saved.createdAt,
      });

      return saved;
    });
  }

  async acceptRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const { userId1, userId2 } = this.normalizeUserIds(
      currentUserId,
      targetUserId,
    );

    // Fix #7: Transaction đảm bảo save và emit luôn nhất quán
    return this.friendRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Friend);

      const friendRequest = await repo.findOne({
        where: { userId1, userId2, status: FriendStatus.PENDING },
      });

      if (!friendRequest) {
        throw new BadRequestException('Yêu cầu kết bạn không tồn tại');
      }

      // Chỉ người NHẬN mới được accept (actionUserId là người đã gửi)
      if (friendRequest.actionUserId === currentUserId) {
        throw new BadRequestException(
          'Bạn không thể tự chấp nhận lời mời của chính mình',
        );
      }

      friendRequest.status = FriendStatus.ACCEPTED;
      friendRequest.actionUserId = currentUserId;
      const saved = await repo.save(friendRequest);

      // Thông báo cho người đã gửi lời mời
      const requesterId = this.getOtherId(saved, currentUserId);
      this.friendsGateway.emitFriendRequestAccepted(requesterId, {
        friendId: saved.id,
        userId1: saved.userId1,
        userId2: saved.userId2,
        status: saved.status,
        updatedAt: saved.updatedAt,
      });

      return saved;
    });
  }

  async cancelRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const { userId1, userId2 } = this.normalizeUserIds(
      currentUserId,
      targetUserId,
    );

    // Fix #7: Transaction
    return this.friendRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Friend);

      const friendRequest = await repo.findOne({
        where: { userId1, userId2, status: FriendStatus.PENDING },
      });

      if (!friendRequest) {
        throw new BadRequestException('Yêu cầu kết bạn không tồn tại');
      }

      // Chỉ người đã GỬI mới được cancel
      if (friendRequest.actionUserId !== currentUserId) {
        throw new ForbiddenException(
          'Bạn không thể hủy lời mời mà bạn chưa gửi',
        );
      }

      friendRequest.status = FriendStatus.CANCELLED;
      friendRequest.actionUserId = currentUserId;
      const saved = await repo.save(friendRequest);

      this.friendsGateway.emitFriendRequestCancelled(targetUserId, {
        friendId: saved.id,
        fromUserId: currentUserId,
        toUserId: targetUserId,
        status: saved.status,
        updatedAt: saved.updatedAt,
      });

      return saved;
    });
  }

  async unfriend(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const { userId1, userId2 } = this.normalizeUserIds(
      currentUserId,
      targetUserId,
    );

    // Fix #7: Transaction
    return this.friendRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Friend);

      const friendship = await repo.findOne({
        where: { userId1, userId2, status: FriendStatus.ACCEPTED },
      });

      if (!friendship) {
        throw new BadRequestException('Mối quan hệ bạn bè không tồn tại');
      }

      friendship.status = FriendStatus.UNFRIENDED;
      friendship.actionUserId = currentUserId;
      const saved = await repo.save(friendship);

      this.friendsGateway.emitUnfriended(targetUserId, {
        friendId: saved.id,
        fromUserId: currentUserId,
        toUserId: targetUserId,
        status: saved.status,
        updatedAt: saved.updatedAt,
      });

      return saved;
    });
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  // Fix #4: Pagination và filter thực hiện tại DB, không load hết rồi slice ở JS
  async getFriendsList(
    currentUserId: number,
    queryDto: QueryFriendDto,
  ): Promise<PaginatedFriends> {
    const { query, current = 1, pageSize = 10 } = queryDto;

    const qb = this.friendRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.user1', 'u1')
      .leftJoinAndSelect('f.user2', 'u2')
      .where('(f.userId1 = :id OR f.userId2 = :id) AND f.status = :status', {
        id: currentUserId,
        status: FriendStatus.ACCEPTED,
      });

    if (query) {
      qb.andWhere(
        `(
          LOWER(u1.name) LIKE :q OR LOWER(u1.email) LIKE :q OR
          LOWER(u2.name) LIKE :q OR LOWER(u2.email) LIKE :q
        )`,
        { q: `%${query.toLowerCase()}%` },
      );
    }

    const [friendships, total] = await qb
      .orderBy('f.updatedAt', 'DESC')
      .skip((current - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const result = friendships.map((f) => {
      const other = f.userId1 === currentUserId ? f.user2 : f.user1;
      return this.mapUserInfo(other);
    });

    return {
      result,
      total,
      totalPage: Math.ceil(total / pageSize),
      current,
      pageSize,
    };
  }

  // Fix #8: Thêm pagination cho getFriendPending
  async getFriendPending(
    currentUserId: number,
    queryDto: QueryFriendDto,
  ): Promise<{
    result: PendingRequestItem[];
    total: number;
    totalPage: number;
  }> {
    const { current = 1, pageSize = 10 } = queryDto;

    // Lọc ngay tại DB: lời mời mà mình là người NHẬN (actionUserId != currentUserId)
    const [requests, total] = await this.friendRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.user1', 'u1')
      .leftJoinAndSelect('f.user2', 'u2')
      .where(
        `(f.userId1 = :id OR f.userId2 = :id)
          AND f.status = :status
          AND f.actionUserId != :id`,
        { id: currentUserId, status: FriendStatus.PENDING },
      )
      .orderBy('f.createdAt', 'DESC')
      .skip((current - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const result: PendingRequestItem[] = requests.map((f) => {
      const sender = f.userId1 === currentUserId ? f.user2 : f.user1;
      return {
        id: f.id,
        userId1: f.userId1,
        userId2: f.userId2,
        status: f.status,
        actionUserId: f.actionUserId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        sender: this.mapUserInfo(sender),
      };
    });

    return { result, total, totalPage: Math.ceil(total / pageSize) };
  }

  // Fix #4: DB-level pagination và filter, giống getFriendsList
  async getUserFriends(
    userId: number,
    queryDto: QueryFriendDto,
  ): Promise<PaginatedFriends> {
    const { query, current = 1, pageSize = 10 } = queryDto;

    const qb = this.friendRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.user1', 'u1')
      .leftJoinAndSelect('f.user2', 'u2')
      .where('(f.userId1 = :id OR f.userId2 = :id) AND f.status = :status', {
        id: userId,
        status: FriendStatus.ACCEPTED,
      });

    if (query) {
      qb.andWhere(
        `(
          LOWER(u1.name) LIKE :q OR LOWER(u1.email) LIKE :q OR
          LOWER(u2.name) LIKE :q OR LOWER(u2.email) LIKE :q
        )`,
        { q: `%${query.toLowerCase()}%` },
      );
    }

    const [friendships, total] = await qb
      .orderBy('f.updatedAt', 'DESC')
      .skip((current - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const result = friendships.map((f) => {
      const other = f.userId1 === userId ? f.user2 : f.user1;
      return this.mapUserInfo(other);
    });

    return {
      result,
      total,
      totalPage: Math.ceil(total / pageSize),
      current,
      pageSize,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private mapUserInfo(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      image: user.image,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
