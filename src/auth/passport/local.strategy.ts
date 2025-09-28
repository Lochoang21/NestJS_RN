
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException(("Thông tin đăng nhập không hợp lệ!"));
    }
    if(user.isActive === false) {
      throw new BadRequestException(("Tài khoản chưa được kích hoạt! Vui lòng kiểm tra email để kích hoạt tài khoản."));
    }
    return user;
  }
}
