/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: 'friends',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class FriendsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  handleConnection(client: Socket) {
    console.log(`🔌 Client attempting to connect: ${client.id}`);
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        (client.handshake.headers.authorization || '').replace('Bearer ', '');

      if (!token) {
        console.log(`❌ No token provided for client ${client.id}`);
        return client.disconnect();
      }

      const payload: any = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // mỗi client join theo userId để nhận event
      client.join(`user:${userId}`);
      console.log(`✅ Client ${client.id} connected as user ${userId}`);
    } catch (error) {
      console.log(`❌ Token verification failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  // ===== Các hàm helper cho FriendsService gọi =====

  emitFriendRequestCreated(targetUserId: number, payload: any) {
    this.server
      .to(`user:${targetUserId}`)
      .emit('friend:request:received', payload);
  }

  emitFriendRequestAccepted(targetUserId: number, payload: any) {
    this.server
      .to(`user:${targetUserId}`)
      .emit('friend:request:accepted', payload);
  }

  emitFriendRequestCancelled(targetUserId: number, payload: any) {
    this.server
      .to(`user:${targetUserId}`)
      .emit('friend:request:cancelled', payload);
  }

  emitUnfriended(targetUserId: number, payload: any) {
    this.server.to(`user:${targetUserId}`).emit('friend:unfriended', payload);
  }
}