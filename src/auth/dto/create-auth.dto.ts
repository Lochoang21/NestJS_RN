import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsNotEmpty({ message: 'Password không được để trống' })
  password: string;

  @IsOptional()
  name: string;
}

export class CheckCodeDto {
  @IsNotEmpty({ message: 'Id không được để trống' })
  id: number;

  @IsNotEmpty({ message: 'Code không được để trống' })
  code: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Code không được để trống' })
  code: string;

  @IsNotEmpty({ message: 'Password không được để trống' })
  password: string;

  @IsNotEmpty({ message: 'ComfirmPassword không được để trống' })
  confirmPassword: string;

  @IsNotEmpty({ message: 'email không được để trống' })
  email: string;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refreshToken: string;
}
