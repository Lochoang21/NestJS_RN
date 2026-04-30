import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '@/modules/conversations/entities/message.entity';

export class CreateMessageDto {
  @Type(() => Number)
  @IsNumber()
  conversationId: number;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  replyToMessageId?: number;
}
