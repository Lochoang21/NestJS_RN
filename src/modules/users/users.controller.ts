import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { SearchFriendUserDto } from './dto/search-friend-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Query('query') query: string,
    @Query('current') current: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.usersService.findAll(query, current, pageSize);
  }

  @Get('search-friends')
  @UseGuards(JwtAuthGuard)
  searchUsersForFriendInvite(
    @Request() req,
    @Query() queryDto: SearchFriendUserDto,
  ) {
    return this.usersService.searchUsersForFriendInvite(req.user.id, queryDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch()
  update(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post('reset-image')
  @UseGuards(JwtAuthGuard)
  resetImage(@Body('id', ParseIntPipe) id: number) {
    return this.usersService.resetImage(id);
  }
}
