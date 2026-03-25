import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi' })
  @MaxLength(100, { message: 'Tên tối đa 100 ký tự' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @MaxLength(255, { message: 'Địa chỉ tối đa 255 ký tự' })
  address?: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  @IsString({ message: 'Tiểu sử phải là chuỗi' })
  @MaxLength(500, { message: 'Tiểu sử tối đa 500 ký tự' })
  bio?: string;
}
