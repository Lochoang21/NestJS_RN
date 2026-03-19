import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { CreateFriendDto } from './dto/create-friend.dto';
import { QueryFriendDto } from './dto/query-friend.dto';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { ResponseMessage } from 'src/decorator/customize';

@ApiTags('friends')
@Controller('friends')
// Fix #6: Đặt UseGuards ở class level — áp dụng cho toàn bộ controller,
// không cần lặp lại trên từng method
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /**
   * Gửi lời mời kết bạn — tạo resource mới → POST
   * POST /friends/request
   */
  @Post('request')
  @ResponseMessage('Gửi yêu cầu kết bạn thành công')
  createRequest(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.createRequest(req.user.id, createFriendDto);
  }

  /**
   * Chấp nhận lời mời — cập nhật trạng thái resource → PATCH
   * PATCH /friends/request/accept
   *
   * Lý do không dùng PATCH /friends/:id/accept:
   * Client có thể không biết friendId, chỉ biết targetUserId.
   * Service sẽ tự tìm record bằng cặp (currentUserId, targetUserId).
   */
  @Patch('request/accept')
  @ResponseMessage('Chấp nhận lời mời kết bạn thành công')
  acceptRequest(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.acceptRequest(req.user.id, createFriendDto);
  }

  /**
   * Hủy lời mời đã gửi — xóa/thu hồi resource → DELETE
   * DELETE /friends/request
   */
  @Delete('request')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Hủy lời mời kết bạn thành công')
  cancelRequest(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.cancelRequest(req.user.id, createFriendDto);
  }

  /**
   * Hủy kết bạn — xóa mối quan hệ → DELETE
   * DELETE /friends
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Hủy kết bạn thành công')
  unfriend(@Body() createFriendDto: CreateFriendDto, @Request() req) {
    return this.friendsService.unfriend(req.user.id, createFriendDto);
  }

  /**
   * Lấy danh sách bạn bè của bản thân (có phân trang + tìm kiếm)
   * GET /friends
   */
  @Get()
  @ResponseMessage('Lấy danh sách bạn bè thành công')
  getFriendsList(@Request() req, @Query() queryDto: QueryFriendDto) {
    return this.friendsService.getFriendsList(req.user.id, queryDto);
  }

  /**
   * Lấy danh sách lời mời đang chờ (có phân trang)
   * GET /friends/pending
   */
  @Get('pending')
  @ResponseMessage('Lấy danh sách lời mời kết bạn thành công')
  getFriendPending(@Request() req, @Query() queryDto: QueryFriendDto) {
    return this.friendsService.getFriendPending(req.user.id, queryDto);
  }

  /**
   * Lấy danh sách bạn bè của user khác (có phân trang + tìm kiếm)
   * GET /friends/users/:id
   */
  @Get('users/:id')
  @ResponseMessage('Lấy danh sách bạn bè của người dùng thành công')
  getUserFriends(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: QueryFriendDto,
  ) {
    return this.friendsService.getUserFriends(id, queryDto);
  }
}
