import { FriendStatus } from '../enums/friend-status.enum';

// ─── WebSocket Event Payloads ────────────────────────────────────────────────

export interface FriendRequestCreatedEvent {
  friendId: number;
  fromUserId: number;
  toUserId: number;
  status: FriendStatus;
  createdAt: Date;
}

export interface FriendRequestAcceptedEvent {
  friendId: number;
  userId1: number;
  userId2: number;
  status: FriendStatus;
  updatedAt: Date;
}

export interface FriendRequestCancelledEvent {
  friendId: number;
  fromUserId: number;
  toUserId: number;
  status: FriendStatus;
  updatedAt: Date;
}

export interface FriendRequestRejectedEvent {
  friendId: number;
  fromUserId: number;
  toUserId: number;
  status: FriendStatus;
  updatedAt: Date;
}

export interface UnfriendedEvent {
  friendId: number;
  fromUserId: number;
  toUserId: number;
  status: FriendStatus;
  updatedAt: Date;
}

// ─── Service Response Shapes ─────────────────────────────────────────────────

export interface FriendUserInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  image: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingRequestItem {
  id: number;
  userId1: number;
  userId2: number;
  status: FriendStatus;
  actionUserId: number;
  createdAt: Date;
  updatedAt: Date;
  sender: FriendUserInfo;
}

export interface PaginatedFriends {
  result: FriendUserInfo[];
  total: number;
  totalPage: number;
  current: number;
  pageSize: number;
}
