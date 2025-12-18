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

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  create(createFriendDto: CreateFriendDto) {
    return 'This action adds a new friend';
  }

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

    const existingFriend = await this.friendRepository.findOne({
      where: [
        { userId1: currentUserId, userId2: targetUserId },
        { userId1: targetUserId, userId2: currentUserId },
      ],
    });

    if (existingFriend) {
      if (existingFriend.status === FriendStatus.ACCEPTED) {
        throw new BadRequestException('Hai người đã là bạn bè');
      }
      if (existingFriend.status === FriendStatus.PENDING) {
        throw new BadRequestException('Lời mời kết bạn đang chờ xử lý');
      }

      throw new BadRequestException('Không thể gửi lời mời kết bạn');
    }

    const friend = this.friendRepository.create({
      userId1: currentUserId,
      userId2: targetUserId,
      status: FriendStatus.PENDING,
      actionUserId: currentUserId,
    });

    return await this.friendRepository.save(friend);
  }

  async acceptRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const friendRequest = await this.friendRepository.findOne({
      where: {
        userId1: targetUserId,
        userId2: currentUserId,
        status: FriendStatus.PENDING,
      },
    });
    if (!friendRequest) {
      throw new BadRequestException('Yêu cầu kết bạn không tồn tại');
    }
    friendRequest.status = FriendStatus.ACCEPTED;
    friendRequest.actionUserId = currentUserId;
    return await this.friendRepository.save(friendRequest);
  }

  async cancelRequest(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const friendRequest = await this.friendRepository.findOne({
      where: {
        userId1: currentUserId,
        userId2: targetUserId,
        status: FriendStatus.PENDING,
      },
    });
    if (!friendRequest) {
      throw new BadRequestException('Yêu cầu kết bạn không tồn tại');
    }
    friendRequest.status = FriendStatus.CANCELLED;
    friendRequest.actionUserId = currentUserId;
    return await this.friendRepository.save(friendRequest);
  }

  async unfriend(
    currentUserId: number,
    createFriendDto: CreateFriendDto,
  ): Promise<Friend> {
    const { targetUserId } = createFriendDto;
    const friendship = await this.friendRepository.findOne({
      where: [
        { userId1: currentUserId, userId2: targetUserId, status: FriendStatus.ACCEPTED },
        { userId1: targetUserId, userId2: currentUserId, status: FriendStatus.ACCEPTED },
      ],
    });
    if (!friendship) {
      throw new BadRequestException('Mối quan hệ bạn bè không tồn tại');
    }
    friendship.status = FriendStatus.UNFRIENDED;
    friendship.actionUserId = currentUserId;
    return await this.friendRepository.save(friendship);
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
      return friendship.userId1 === currentUserId
        ? friendship.user2
        : friendship.user1;
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

  async getFriendPending(currentUserId: number): Promise<Friend[]> {
    const pendingRequests = await this.friendRepository.find({
      where: {
        userId2: currentUserId,
        status: FriendStatus.PENDING,
      },
      relations: ['user1'],
    });
    return pendingRequests;
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
      return friendship.userId1 === userId
        ? friendship.user2
        : friendship.user1;
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

  findAll() {
    return `This action returns all friends`;
  }

  findOne(id: number) {
    return `This action returns a #${id} friend`;
  }

  update(id: number, updateFriendDto: UpdateFriendDto) {
    return `This action updates a #${id} friend`;
  }

  remove(id: number) {
    return `This action removes a #${id} friend`;
  }
}
