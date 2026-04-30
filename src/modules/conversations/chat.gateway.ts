import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '@/modules/messages/messages.service';
import { ParticipantsService } from '@/modules/participants/participants.service';
import {
  JoinConversationDto,
  SeenMessageDto,
  SendMessageDto,
  TypingDto,
} from './dto/chat-events.dto';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly participantsService: ParticipantsService,
  ) { }

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

      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      // optional: update online status
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinConversationDto,
  ) {
    const userId = this.getUserId(client);
    await this.participantsService.ensureParticipant(dto.conversationId, userId);

    const room = this.getConversationRoom(dto.conversationId);
    await client.join(room);

    return { room };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = this.getUserId(client);
    const message = await this.messagesService.create(userId, dto);
    const room = this.getConversationRoom(dto.conversationId);

    this.server.to(room).emit('new_message', {
      message,
    });

    return { messageId: message.id };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: TypingDto,
  ) {
    const userId = this.getUserId(client);
    await this.participantsService.ensureParticipant(dto.conversationId, userId);

    const room = this.getConversationRoom(dto.conversationId);
    const payload = {
      conversationId: dto.conversationId,
      userId,
      isTyping: dto.isTyping,
    };

    client.to(room).emit('user_typing', payload);

    return payload;
  }

  @SubscribeMessage('seen_message')
  async handleSeenMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SeenMessageDto,
  ) {
    const userId = this.getUserId(client);
    const seenAt = new Date();

    await this.participantsService.updateLastRead(
      dto.conversationId,
      userId,
      seenAt,
    );

    const room = this.getConversationRoom(dto.conversationId);
    const payload = {
      conversationId: dto.conversationId,
      userId,
      messageId: dto.messageId ?? null,
      seenAt,
    };

    client.to(room).emit('message_seen', payload);

    return payload;
  }

  private getConversationRoom(conversationId: number) {
    return `conversation_${conversationId}`;
  }

  private getUserId(client: Socket): number {
    const userId = client.data?.userId;
    if (!userId) {
      throw new WsException('Unauthorized socket');
    }
    return userId;
  }
}
