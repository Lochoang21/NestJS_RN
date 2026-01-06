/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { Friend } from './entities/friend.entity';
import { User } from '../users/entities/user.entity';
import { FriendStatus } from './enums/friend-status.enum';
import { FriendsGateway } from './friends-gateway';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly friendsGateway: FriendsGateway,
  ) { }

  async createRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;

    if (currentUserId === targetUserId) {
      throw new BadRequestException('Bạn không thể gửi lời mời kết bạn cho chính mình');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new BadRequestException('Người dùng nhận lời mời không tồn tại');
    }

    // Đảm bảo thứ tự userId1 < userId2 để phù hợp constraint trong DB
    const [userId1, userId2] =
      currentUserId < targetUserId
        ? [currentUserId, targetUserId]
        : [targetUserId, currentUserId];

    const existingFriend = await this.friendRepository.findOne({
      where: { userId1, userId2 },
    });

    if (existingFriend) {
      if (existingFriend.status === FriendStatus.ACCEPTED) {
        throw new BadRequestException('Hai người đã là bạn bè');
      }
      if (existingFriend.status === FriendStatus.PENDING) {
        // Nếu người kia đã gửi lời mời trước → tự động accept luôn (gửi chéo)
        if (existingFriend.actionUserId !== currentUserId) {
          existingFriend.status = FriendStatus.ACCEPTED;
          existingFriend.actionUserId = currentUserId;
          const savedFriend = await this.friendRepository.save(existingFriend);

          // Gửi sự kiện accepted cho người đã gửi trước
          this.friendsGateway.emitFriendRequestAccepted(targetUserId, {
            friendId: savedFriend.id,
            userId1: savedFriend.userId1,
            userId2: savedFriend.userId2,
            status: savedFriend.status,
            updatedAt: savedFriend.updatedAt,
          });

          return savedFriend;
        }
        // Nếu mình đã gửi lời mời rồi → không cho gửi lại
        throw new BadRequestException('Lời mời kết bạn đang chờ xử lý');
      }

      // Nếu trước đó đã unfriend hoặc đã huỷ lời mời thì cho phép gửi lại
      if (
        existingFriend.status === FriendStatus.UNFRIENDED ||
        existingFriend.status === FriendStatus.CANCELLED
      ) {
        existingFriend.status = FriendStatus.PENDING;
        existingFriend.actionUserId = currentUserId;
        const savedFriend = await this.friendRepository.save(existingFriend);

        // Gửi sự kiện qua WebSocket
        this.friendsGateway.emitFriendRequestCreated(targetUserId, {
          friendId: savedFriend.id,
          fromUserId: currentUserId,
          toUserId: targetUserId,
          status: savedFriend.status,
          createdAt: savedFriend.createdAt,
        });

        return savedFriend;
      }

      throw new BadRequestException('Không thể gửi lời mời kết bạn');
    }

    const friend = this.friendRepository.create({
      userId1,
      userId2,
      status: FriendStatus.PENDING,
      actionUserId: currentUserId,
    });

    const savedFriend = await this.friendRepository.save(friend);

    // Gửi sự kiện qua WebSocket
    this.friendsGateway.emitFriendRequestCreated(targetUserId, {
      friendId: savedFriend.id,
      fromUserId: currentUserId,
      toUserId: targetUserId,
      status: savedFriend.status,
      createdAt: savedFriend.createdAt,
    });

    return savedFriend; 
  }

  async acceptRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const [userId1, userId2] =
      currentUserId < targetUserId
        ? [currentUserId, targetUserId]
        : [targetUserId, currentUserId];
    const friendRequest = await this.friendRepository.findOne({
      where: {
        userId1,
        userId2,
        status: FriendStatus.PENDING,
      },
    });
    if (!friendRequest) {
      throw new BadRequestException('Yêu cầu kết bạn không tồn tại');
    }

    // Chỉ người NHẬN lời mời mới được accept (không phải người gửi)
    if (friendRequest.actionUserId === currentUserId) {
      throw new BadRequestException('Bạn không thể tự chấp nhận lời mời của chính mình');
    }

    friendRequest.status = FriendStatus.ACCEPTED;
    friendRequest.actionUserId = currentUserId;

    const savedFriendRequest = await this.friendRepository.save(friendRequest);

    // Xác định người gửi lời mời
    const requesterId = savedFriendRequest.userId1 === currentUserId
      ? savedFriendRequest.userId2
      : savedFriendRequest.userId1;

    // Gửi sự kiện qua WebSocket
    this.friendsGateway.emitFriendRequestAccepted(requesterId, {
      friendId: savedFriendRequest.id,
      userId1: savedFriendRequest.userId1,
      userId2: savedFriendRequest.userId2,
      status: savedFriendRequest.status,
      updatedAt: savedFriendRequest.updatedAt,
    });

    return savedFriendRequest;
  }

  async cancelRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const [userId1, userId2] =
      currentUserId < targetUserId
        ? [currentUserId, targetUserId]
        : [targetUserId, currentUserId];
    const friendRequest = await this.friendRepository.findOne({
      where: {
        userId1,
        userId2,
        status: FriendStatus.PENDING,
      },
    });
    if (!friendRequest) {
      throw new BadRequestException('Yêu cầu kết bạn không tồn tại');
    }
    friendRequest.status = FriendStatus.CANCELLED;
    friendRequest.actionUserId = currentUserId;

    const savedFriendRequest = await this.friendRepository.save(friendRequest);
    // Gửi sự kiện qua WebSocket
    this.friendsGateway.emitFriendRequestCancelled(targetUserId, {
      friendId: savedFriendRequest.id,
      fromUserId: currentUserId,
      toUserId: targetUserId,
      status: savedFriendRequest.status,
      updatedAt: savedFriendRequest.updatedAt,
    });
    return savedFriendRequest;
  }

  async unfriend(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const [userId1, userId2] =
      currentUserId < targetUserId
        ? [currentUserId, targetUserId]
        : [targetUserId, currentUserId];
    const friendship = await this.friendRepository.findOne({
      where: {
        userId1,
        userId2,
        status: FriendStatus.ACCEPTED,
      },
    });
    if (!friendship) {
      throw new BadRequestException('Mối quan hệ bạn bè không tồn tại');
    }
    friendship.status = FriendStatus.UNFRIENDED;
    friendship.actionUserId = currentUserId;

    const savedFriendship = await this.friendRepository.save(friendship);
    // Gửi sự kiện qua WebSocket
    this.friendsGateway.emitUnfriended(targetUserId, {
      friendId: savedFriendship.id,
      fromUserId: currentUserId,
      toUserId: targetUserId,
      status: savedFriendship.status,
      updatedAt: savedFriendship.updatedAt,
    });

    return savedFriendship;
  }

  async getFriendsList(
    currentUserId: number,
    query: string,
    current: number,
    pageSize: number,
  ) {
    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const skip = (current - 1) * pageSize;

    const friendships = await this.friendRepository.find({
      where: [
        { userId1: currentUserId, status: FriendStatus.ACCEPTED },
        { userId2: currentUserId, status: FriendStatus.ACCEPTED },
      ],
      relations: ['user1', 'user2'],
    });

    let friends = friendships.map((friendship) => {
      const otherUser =
        friendship.userId1 === currentUserId
          ? friendship.user2
          : friendship.user1;

      // Chỉ trả ra các thông tin cơ bản, tương tự UsersService.findAll/findOne
      return {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email,
        phone: otherUser.phone,
        address: otherUser.address,
        image: otherUser.image,
        isActive: otherUser.isActive,
        createdAt: otherUser.createdAt,
        updatedAt: otherUser.updatedAt,
      };
    });

    // Filter by query (name or email)
    if (query) {
      const searchTerm = query.toLowerCase();
      friends = friends.filter(
        (friend) =>
          friend.name?.toLowerCase().includes(searchTerm) ||
          friend.email?.toLowerCase().includes(searchTerm),
      );
    }

    const totalItems = friends.length;
    const totalPage = Math.ceil(totalItems / pageSize);

    // Apply pagination
    const result = friends.slice(skip, skip + pageSize);

    return { result, totalPage };
  }

  async getFriendPending(currentUserId: number) {
    const pendingRequests = await this.friendRepository.find({
      where: [
        {
          userId1: currentUserId,
          status: FriendStatus.PENDING,
        },
        {
          userId2: currentUserId,
          status: FriendStatus.PENDING,
        },
      ],
      relations: ['user1', 'user2'],
    });

    // Lọc ra những lời mời mà mình là người nhận (actionUserId != currentUserId)
    const receivedRequests = pendingRequests.filter(
      (friendship) => friendship.actionUserId !== currentUserId,
    );

    // Map lại để trả về thông tin người gửi lời mời
    return receivedRequests.map((friendship) => {
      const sender =
        friendship.userId1 === currentUserId
          ? friendship.user2
          : friendship.user1;

      return {
        id: friendship.id,
        userId1: friendship.userId1,
        userId2: friendship.userId2,
        status: friendship.status,
        actionUserId: friendship.actionUserId,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt,
        sender: {
          id: sender.id,
          name: sender.name,
          email: sender.email,
          phone: sender.phone,
          address: sender.address,
          image: sender.image,
          isActive: sender.isActive,
          createdAt: sender.createdAt,
          updatedAt: sender.updatedAt,
        },
      };
    });
  }

  async getUserFriends(
    userId: number,
    query: string,
    current: number,
    pageSize: number,
  ) {
    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const skip = (current - 1) * pageSize;

    const friendships = await this.friendRepository.find({
      where: [
        { userId1: userId, status: FriendStatus.ACCEPTED },
        { userId2: userId, status: FriendStatus.ACCEPTED },
      ],
      relations: ['user1', 'user2'],
    });

    let friends = friendships.map((friendship) => {
      const otherUser =
        friendship.userId1 === userId ? friendship.user2 : friendship.user1;

      // Chỉ trả ra các thông tin cơ bản, tương tự UsersService.findAll/findOne
      return {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email,
        phone: otherUser.phone,
        address: otherUser.address,
        image: otherUser.image,
        isActive: otherUser.isActive,
        createdAt: otherUser.createdAt,
        updatedAt: otherUser.updatedAt,
      };
    });

    // Filter by query (name or email)
    if (query) {
      const searchTerm = query.toLowerCase();
      friends = friends.filter(
        (friend) =>
          friend.name?.toLowerCase().includes(searchTerm) ||
          friend.email?.toLowerCase().includes(searchTerm),
      );
    }

    const totalItems = friends.length;
    const totalPage = Math.ceil(totalItems / pageSize);

    // Apply pagination
    const result = friends.slice(skip, skip + pageSize);

    return { result, totalPage };
  }
}
