import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '@/modules/messages/messages.module';
import { ParticipantsModule } from '@/modules/participants/participants.module';

@Module({
  imports: [JwtModule, ConfigModule, MessagesModule, ParticipantsModule],
  providers: [ChatGateway],
})
export class ChatModule { }
