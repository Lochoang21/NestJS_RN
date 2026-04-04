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
import { User } from '../users/entities/user.entity';

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
   *
   * Điều này giúp mọi truy vấn quan hệ bạn bè giữa 2 user luôn ổn định,
   * tránh tạo trùng record chỉ vì thứ tự truyền vào khác nhau.
   */
  private normalizeUserIds(
    a: number,
    b: number,
  ): { userId1: number; userId2: number } {
    return a < b ? { userId1: a, userId2: b } : { userId1: b, userId2: a };
  }

  /**
   * Lấy userId của người còn lại trong cặp quan hệ bạn bè.
   *
   * Dùng khi đã có record Friend nhưng cần xác định "đối phương"
   * để gửi thông báo WebSocket.
   */
  private getOtherId(record: Friend, currentUserId: number): number {
    return Number(record.userId1) === Number(currentUserId)
      ? Number(record.userId2)
      : Number(record.userId1);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Tạo lời mời kết bạn mới từ currentUserId đến targetUserId.
   *
   * Luồng xử lý chính:
   * - Chặn tự kết bạn với chính mình.
   * - Kiểm tra user đích có tồn tại.
   * - Chuẩn hóa cặp userId để truy vấn đúng record duy nhất.
   * - Nếu đã có record:
   *   + ACCEPTED: báo đã là bạn.
   *   + PENDING và do đối phương gửi: auto-accept.
   *   + PENDING và do chính mình gửi: báo đang chờ.
   *   + UNFRIENDED/CANCELLED: tái sử dụng record và chuyển về PENDING.
   * - Nếu chưa có record: tạo mới trạng thái PENDING.
   *
   * Tất cả chạy trong transaction để cập nhật DB và phát event theo cùng 1 luồng nghiệp vụ.
   */
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

  /**
   * Chấp nhận lời mời kết bạn đang ở trạng thái PENDING.
   *
   * Quy tắc:
   * - Chỉ người nhận lời mời mới được accept.
   * - Người gửi không được tự accept lời mời của mình.
   *
   * Sau khi cập nhật thành ACCEPTED, hệ thống emit event cho người gửi.
   */
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

  /**
   * Từ chối lời mời kết bạn đang chờ xử lý.
   *
   * Quy tắc:
   * - Chỉ người nhận lời mời mới được từ chối.
   * - Người gửi không được tự từ chối lời mời do chính mình tạo.
   *
   * Hiện tại hệ thống dùng trạng thái CANCELLED cho cả hai trường hợp:
   * - Người gửi tự hủy lời mời.
   * - Người nhận từ chối lời mời.
   *
   * API và WebSocket event được tách riêng để client phân biệt hành vi nghiệp vụ.
   */
  async rejectRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const { userId1, userId2 } = this.normalizeUserIds(
      currentUserId,
      targetUserId,
    );

    return this.friendRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Friend);

      const friendRequest = await repo.findOne({
        where: { userId1, userId2, status: FriendStatus.PENDING },
      });

      if (!friendRequest) {
        throw new BadRequestException('Yêu cầu kết bạn không tồn tại');
      }

      // Chỉ người NHẬN mới được reject
      if (friendRequest.actionUserId === currentUserId) {
        throw new ForbiddenException(
          'Bạn không thể từ chối lời mời do chính mình gửi',
        );
      }

      friendRequest.status = FriendStatus.CANCELLED;
      friendRequest.actionUserId = currentUserId;
      const saved = await repo.save(friendRequest);

      // Thông báo cho người đã gửi lời mời rằng yêu cầu bị từ chối
      const requesterId = this.getOtherId(saved, currentUserId);
      this.friendsGateway.emitFriendRequestRejected(requesterId, {
        friendId: saved.id,
        fromUserId: currentUserId,
        toUserId: requesterId,
        status: saved.status,
        updatedAt: saved.updatedAt,
      });

      return saved;
    });
  }

  /**
   * Hủy lời mời kết bạn đang chờ xử lý.
   *
   * Quy tắc:
   * - Chỉ người đã gửi lời mời (actionUserId) mới được hủy.
   * - Chỉ thao tác trên lời mời ở trạng thái PENDING.
   *
   * Khi hủy thành công, trạng thái chuyển sang CANCELLED và emit event cho người nhận.
   */
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

  /**
   * Hủy quan hệ bạn bè đã được chấp nhận trước đó.
   *
   * Chỉ xử lý khi record đang ở trạng thái ACCEPTED.
   * Sau khi unfriend, trạng thái chuyển thành UNFRIENDED và phát sự kiện cho đối phương.
   */
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
  /**
   * Lấy danh sách bạn bè của người dùng hiện tại có phân trang.
   *
   * Hỗ trợ tìm kiếm theo tên/email của cả hai phía trong cặp user1-user2.
   * Kết quả trả về chỉ chứa thông tin "người còn lại" trong mối quan hệ,
   * không trả về chính currentUser.
   */
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
      const other =
        Number(f.userId1) === Number(currentUserId) ? f.user2 : f.user1;
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
  /**
   * Lấy danh sách lời mời kết bạn đang chờ mà currentUser là người nhận.
   *
   * Điều kiện lọc:
   * - Thuộc cặp quan hệ có chứa currentUser.
   * - Trạng thái PENDING.
   * - actionUserId khác currentUser (tức người gửi là đối phương).
   */
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
      const sender =
        Number(f.userId1) === Number(currentUserId) ? f.user2 : f.user1;
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
  /**
   * Lấy danh sách bạn bè của một user bất kỳ theo userId, có phân trang và tìm kiếm.
   *
   * Hàm này dùng cho màn hình profile hoặc API public nội bộ,
   * nơi caller cần truy vấn danh sách bạn của người khác thay vì chính mình.
   */
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
      const other = Number(f.userId1) === Number(userId) ? f.user2 : f.user1;
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

  /**
   * Chuẩn hóa object user trước khi trả ra response.
   *
   * Mục tiêu là giới hạn field đầu ra theo hợp đồng API,
   * tránh trả dư dữ liệu không cần thiết từ entity quan hệ.
   */
  private mapUserInfo(user: User) {
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
