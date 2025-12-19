/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { comparePasswordHelper } from '@/helpers/util';
import { JwtService } from '@nestjs/jwt';
import {
  ChangePasswordDto,
  CheckCodeDto,
  CreateAuthDto,
  RefreshTokenDto,
} from './dto/create-auth.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    if (!user) return null;

    const isValidPassword = await comparePasswordHelper(pass, user.password);
    if (!isValidPassword) {
      return null;
    }

    return user;
  }

  async login(user: any) {
    const payload = { username: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES'),
    });

    await this.usersService.setRefreshToken(user.id, refreshToken);

    return {
      user: {
        email: user.email,
        id: user.id,
        name: user.name,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async getProfile(userId: number) {
    // Chỉ trả ra thông tin cơ bản của user (ẩn password, refreshToken, codeId, ...)
    return await this.usersService.findOne(userId);
  }

  async register(registerDto: CreateAuthDto) {
    return await this.usersService.handleRegister(registerDto);
  }

  async checkCode(data: CheckCodeDto) {
    return await this.usersService.handleActive(data);
  }

  async retryActive(email: string) {
    return await this.usersService.retryActive(email);
  }

  async retryPassword(email: string) {
    return await this.usersService.retryPassword(email);
  }

  async changePassword(data: ChangePasswordDto) {
    return await this.usersService.changePassword(data);
  }

  async refreshToken(data: RefreshTokenDto) {
    const { refreshToken } = data;

    try {
      const payload: any = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.usersService.findByIdInternal(payload.sub);
      if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const newPayload = { username: user.email, sub: user.id };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES'),
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES'),
      });

      await this.usersService.setRefreshToken(user.id, newRefreshToken);

      return {
        user: {
          email: user.email,
          id: user.id,
          name: user.name,
        },
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }
}
