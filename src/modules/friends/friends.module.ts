import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { FriendsGateway } from './friends-gateway';
import { Friend } from './entities/friend.entity';

// Fix #3: Import UsersModule để dùng UsersService thay vì inject
// trực tiếp UserRepository của module khác.
// Yêu cầu UsersModule phải export UsersService:
//   @Module({ exports: [UsersService] }) export class UsersModule {}
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // Fix #3: Chỉ đăng ký entity thuộc module này (Friend),
    // không đăng ký User entity của module khác
    TypeOrmModule.forFeature([Friend]),

    // Cần để FriendsGateway verify JWT khi WebSocket connect
    JwtModule,
    ConfigModule,

    // Fix #3: Import module thay vì inject repo trực tiếp
    UsersModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService, FriendsGateway],
  exports: [FriendsService],
})
export class FriendsModule {}
