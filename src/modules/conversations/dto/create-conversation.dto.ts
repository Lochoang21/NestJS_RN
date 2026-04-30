import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ConversationType } from '../enums/conversation-type.enum';

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  participantIds: number[];

  @IsOptional()
  @IsEnum(ConversationType)
  conversationType?: ConversationType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
