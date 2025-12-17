/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { ResponseMessage } from 'src/decorator/customize';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Tạo bài viết thành công')
  create(@Body() createPostDto: CreatePostDto, @Request() req) {
    return this.postsService.create(createPostDto, req.user.id);
  }

  @Get()
  @ResponseMessage('Lấy danh sách bài viết thành công')
  findAll(
    @Query('query') query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.postsService.findAll(query, +current, +pageSize);
  }

  @Get('author/:userId')
  @ResponseMessage('Lấy bài viết của tác giả thành công')
  findByAuthor(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('query') query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.postsService.findByAuthor(userId, query, +current, +pageSize);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy bài viết của tôi thành công')
  findMyPosts(
    @Request() req,
    @Query('query') query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.postsService.findByAuthor(req.user.id, query, +current, +pageSize);
  }

  @Get('/author/:userId/images')
  @ResponseMessage('Lấy ảnh bài viết của tác giả thành công')
  findImagesByAuthor(@Param('userId', ParseIntPipe) userId: number) {
    return this.postsService.findImagesByAuthor(userId);
  }

  @Get(':id')
  @ResponseMessage('Lấy bài viết thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật bài viết thành công')
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @ResponseMessage('Xoá bài viết thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.remove(id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Thích bài viết thành công')
  likePost(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.postsService.likePost(id, req.user.id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Bỏ thích bài viết thành công')
  unlikePost(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.postsService.unlikePost(id, req.user.id);
  }

  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Bình luận bài viết thành công')
  commentOnPost(
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Body('parentCommentId') parentCommentId: number,
    @Request() req,
  ) {
    return this.postsService.commentOnPost(id, req.user.id, content, parentCommentId);
  }

  @Post('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Xoá bình luận thành công')
  deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req,
  ) {
    return this.postsService.deleteComment(commentId, req.user.id);
  }
}
