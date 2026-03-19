import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Like } from '../posts/entities/like.entity';
import { Friend } from '../friends/entities/friend.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Like, Friend])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
