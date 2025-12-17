/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like as ILike } from 'typeorm';
import { Post } from './entities/post.entity';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) { }

  async create(createPostDto: CreatePostDto, userId: number) {
    const post = this.postRepository.create({
      content: createPostDto.content,
      privacy: createPostDto.privacy as any,
      userId,
      mediaUrls: createPostDto.mediaUrls
        ? JSON.stringify(createPostDto.mediaUrls)
        : null,
    });

    return await this.postRepository.save(post);
  }

  async findAll(query: string, current: number, pageSize: number) {
    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const skip = (current - 1) * pageSize;

    // Parse query parameters for filtering
    const where: any = { isDeleted: 0 };
    if (query) {
      where.content = ILike(`%${query}%`);
    }

    const [posts, totalItems] = await this.postRepository.findAndCount({
      where,
      take: pageSize,
      skip: skip,
      relations: ['user'],
      select: {
        id: true,
        userId: true,
        content: true,
        mediaUrls: true,
        privacy: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    // Parse mediaUrls from JSON string to array
    const result = posts.map((post) => ({
      ...post,
      mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls) : [],
    }));

    const totalPage = Math.ceil(totalItems / pageSize);

    return { result, totalPage };
  }

  async findByAuthor(userId: number, query: string, current: number, pageSize: number) {
    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const skip = (current - 1) * pageSize;

    // Build where condition
    const where: any = { userId, isDeleted: 0 };
    if (query) {
      where.content = ILike(`%${query}%`);
    }

    const [posts, totalItems] = await this.postRepository.findAndCount({
      where,
      take: pageSize,
      skip: skip,
      relations: ['user'],
      select: {
        id: true,
        userId: true,
        content: true,
        mediaUrls: true,
        privacy: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    // Parse mediaUrls from JSON string to array
    const result = posts.map((post) => ({
      ...post,
      mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls) : [],
    }));

    const totalPage = Math.ceil(totalItems / pageSize);

    return { result, totalPage };
  }

  async findImagesByAuthor(userId: number) {
    const posts = await this.postRepository.find({
      where: { userId, isDeleted: 0 },
      select: ['mediaUrls'],
      order: { createdAt: 'DESC' },
    });
    const images = posts
      .map(post => post.mediaUrls ? JSON.parse(post.mediaUrls) : [])
      .flat();
    return images;
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, isDeleted: 0 },
      relations: ['user'],
      select: {
        id: true,
        userId: true,
        content: true,
        mediaUrls: true,
        privacy: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    });
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    const post = await this.postRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }
    const updateData: any = {
      ...updatePostDto,
      mediaUrls: updatePostDto.mediaUrls
        ? JSON.stringify(updatePostDto.mediaUrls)
        : null,
    };
    await this.postRepository.update(id, updateData);
    return { affected: 1 };
  }

  async remove(id: number) {
    const post = await this.postRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }
    return await this.postRepository.update(id, {
      isDeleted: 1,
      deletedAt: new Date(),
    });
  }

  async likePost(postId: number, userId: number) {
    // Check if post exists
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: 0 },
    });

    if (!post) {
      throw new BadRequestException('Bài viết không tồn tại');
    }

    // Check if already liked
    const existingLike = await this.likeRepository.findOne({
      where: { postId, userId },
    });

    if (existingLike) {
      throw new BadRequestException('Bạn đã thích bài viết này rồi');
    }

    // Create new like
    const like = this.likeRepository.create({ postId, userId });
    await this.likeRepository.save(like);

    return { message: 'Đã thích bài viết' };
  }

  async unlikePost(postId: number, userId: number) {
    // Check if post exists
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: 0 },
    });

    if (!post) {
      throw new BadRequestException('Bài viết không tồn tại');
    }

    // Check if liked
    const existingLike = await this.likeRepository.findOne({
      where: { postId, userId },
    });

    if (!existingLike) {
      throw new BadRequestException('Bạn chưa thích bài viết này');
    }
    // Remove like
    await this.likeRepository.delete({ postId, userId });

    return { message: 'Đã bỏ thích bài viết' };
  }

  async commentOnPost(postId: number, userId: number, content: string, parentCommentId?: number) {
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: 0 },
    });
    if (!post) {
      throw new BadRequestException('Bài viết không tồn tại');
    }
    const comment = this.commentRepository.create({ postId, userId, content, parentCommentId });
    await this.commentRepository.save(comment);
    return { message: 'Bình luận bài viết thành công' };
  }

  async deleteComment(commentId: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, isDeleted: 0 },
    });
    if (!comment) {
      throw new BadRequestException('Bình luận không tồn tại');
    }
    await this.commentRepository.update(commentId, {
      isDeleted: 1,
      deletedAt: new Date(),
    });
    return { message: 'Chức năng xoá bình luận chưa được triển khai' };
  }
}
