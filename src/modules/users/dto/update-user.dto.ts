import { IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsNotEmpty({ message: 'ID không được để trống' })
  @IsInt({ message: 'ID phải là số nguyên' })
  @Min(1, { message: 'ID phải lớn hơn 0' })
  @Type(() => Number)
  id: number;

  @IsOptional()
  name?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  image?: string;
}
