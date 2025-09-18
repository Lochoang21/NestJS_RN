
import { IsEmail, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { Mongoose } from 'mongoose';

export class UpdateUserDto {

  @IsMongoId({message: "ID không đúng định dạng"})
  @IsNotEmpty({message: "ID không được để trống"})
  _id: string;

  @IsOptional()
  name?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  image?: string;
}
