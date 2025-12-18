/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Request, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CreateFriendDto } from './dto/create-friend.dto';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { ResponseMessage } from 'src/decorator/customize';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) { }

  @Post('request')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Gửi yêu cầu kết bạn thành công')
  requestFriend(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.createRequest(req.user.id, createFriendDto);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Chấp nhận lời mời kết bạn thành công')
  acceptFriend(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.acceptRequest(req.user.id, createFriendDto);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Hủy lời mời kết bạn thành công')
  cancelFriend(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.cancelRequest(req.user.id, createFriendDto);
  }

  @Post('unfriend')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Hủy kết bạn thành công')
  unfriend(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.unfriend(req.user.id, createFriendDto);
  }

  @Get('friends-list')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy danh sách bạn bè thành công')
  getFriendsList(
    @Request() req,
    @Query('query') query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.friendsService.getFriendsList(req.user.id, query, +current, +pageSize);
  }

  @Get('friend-pending')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy danh sách lời mời kết bạn thành công')
  getFriendPending(@Request() req) {
    return this.friendsService.getFriendPending(req.user.id);
  }

  @Get('users/:id/friends')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy danh sách bạn bè của người dùng thành công')
  getUserFriends(
    @Param('id', ParseIntPipe) id: number,
    @Query('query') query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.friendsService.getUserFriends(+id, query, +current, +pageSize);
  }
}
