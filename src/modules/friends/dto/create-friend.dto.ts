import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateFriendDto {
  @IsNotEmpty({ message: 'Id người dùng không được để trống' })
  @IsNumber({}, { message: 'Id người dùng phải là số' })
  targetUserId: number;
}
