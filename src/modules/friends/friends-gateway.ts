import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  FriendRequestCreatedEvent,
  FriendRequestAcceptedEvent,
  FriendRequestCancelledEvent,
  UnfriendedEvent,
} from './interfaces/friend.interface';

@WebSocketGateway({
  namespace: 'friends',
  cors: {
    origin: true,
    credentials: true,
  },
})
// Fix #1: Implement cả OnGatewayDisconnect để cleanup đúng cách
export class FriendsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as { token?: string })?.token ||
        (client.handshake.headers.authorization ?? '').replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: number }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Mỗi client join vào room riêng theo userId để nhận event cá nhân
      client.join(`user:${userId}`);
    } catch {
      // Token không hợp lệ → ngắt kết nối ngay
      client.disconnect();
    }
  }

  // Fix #1: Xử lý disconnect — Socket.IO tự rời room,
  // nhưng implement interface giúp log và mở rộng sau này
  // (vd: cập nhật trạng thái online/offline vào Redis)
  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      // Có thể mở rộng: cập nhật lastSeen, xóa cache online status, v.v.
    }
  }

  // ─── Emit Helpers (Fix #2: payload có type cụ thể, không dùng any) ──────────

  emitFriendRequestCreated(
    targetUserId: number,
    payload: FriendRequestCreatedEvent,
  ): void {
    this.server
      .to(`user:${targetUserId}`)
      .emit('friend:request:received', payload);
  }

  emitFriendRequestAccepted(
    targetUserId: number,
    payload: FriendRequestAcceptedEvent,
  ): void {
    this.server
      .to(`user:${targetUserId}`)
      .emit('friend:request:accepted', payload);
  }

  emitFriendRequestCancelled(
    targetUserId: number,
    payload: FriendRequestCancelledEvent,
  ): void {
    this.server
      .to(`user:${targetUserId}`)
      .emit('friend:request:cancelled', payload);
  }

  emitUnfriended(targetUserId: number, payload: UnfriendedEvent): void {
    this.server.to(`user:${targetUserId}`).emit('friend:unfriended', payload);
  }
}
