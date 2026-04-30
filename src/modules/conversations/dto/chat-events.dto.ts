import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMessageDto } from '@/modules/messages/dto/create-message.dto';

export class JoinConversationDto {
  @Type(() => Number)
  @IsNumber()
  conversationId: number;
}

export class TypingDto {
  @Type(() => Number)
  @IsNumber()
  conversationId: number;

  @Type(() => Boolean)
  @IsBoolean()
  isTyping: boolean;
}

export class SeenMessageDto {
  @Type(() => Number)
  @IsNumber()
  conversationId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  messageId?: number;
}

export class SendMessageDto extends CreateMessageDto { }
