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
import { Media } from './entities/media.entity';
import { MediableType } from './enums/mediable-type.enum';
import { LikeableType } from './enums/likeable-type.enum';
import { FileType } from './enums/file-type.enum';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) { }

  async create(createPostDto: CreatePostDto, userId: number) {
    const post = this.postRepository.create({
      content: createPostDto.content,
      privacy: createPostDto.privacy as any,
      userId,
    });

    const savedPost = await this.postRepository.save(post);

    // Save media files if provided
    if (createPostDto.mediaUrls && createPostDto.mediaUrls.length > 0) {
      const mediaEntities = createPostDto.mediaUrls.map((url) => {
        return this.mediaRepository.create({
          mediableId: savedPost.id,
          mediableType: MediableType.POST,
          filePath: url,
          fileType: this.detectFileType(url),
        });
      });
      await this.mediaRepository.save(mediaEntities);
    }

    return savedPost;
  }

  private detectFileType(url: string): FileType {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return FileType.IMAGE;
    }
    if (['mp4', 'avi', 'mov', 'webm'].includes(extension || '')) {
      return FileType.VIDEO;
    }
    if (['mp3', 'wav', 'ogg'].includes(extension || '')) {
      return FileType.AUDIO;
    }
    return FileType.FILE;
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

    // Load media for each post
    const result = await Promise.all(
      posts.map(async (post) => {
        const media = await this.mediaRepository.find({
          where: {
            mediableId: post.id,
            mediableType: MediableType.POST,
            isDeleted: 0,
          },
          select: ['id', 'filePath', 'fileType', 'fileName'],
        });

        return {
          ...post,
          mediaUrls: media.map((m) => m.filePath),
        };
      }),
    );

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

    // Load media for each post
    const result = await Promise.all(
      posts.map(async (post) => {
        const media = await this.mediaRepository.find({
          where: {
            mediableId: post.id,
            mediableType: MediableType.POST,
            isDeleted: 0,
          },
          select: ['id', 'filePath', 'fileType', 'fileName'],
        });

        return {
          ...post,
          mediaUrls: media.map((m) => m.filePath),
        };
      }),
    );

    const totalPage = Math.ceil(totalItems / pageSize);

    return { result, totalPage };
  }

  async findImagesByAuthor(userId: number) {
    const posts = await this.postRepository.find({
      where: { userId, isDeleted: 0 },
      select: ['id'],
      order: { createdAt: 'DESC' },
    });

    const postIds = posts.map((post) => post.id);

    if (postIds.length === 0) {
      return [];
    }

    const images = await this.mediaRepository
      .createQueryBuilder('media')
      .where('media.mediable_id IN (:...postIds)', { postIds })
      .andWhere('media.mediable_type = :type', { type: MediableType.POST })
      .andWhere('media.file_type = :fileType', { fileType: FileType.IMAGE })
      .andWhere('media.is_deleted = 0')
      .select(['media.file_path'])
      .orderBy('media.created_at', 'DESC')
      .getMany();

    return images.map((img) => img.filePath);
  }

  async findOne(id: number): Promise<any> {
    const post = await this.postRepository.findOne({
      where: { id, isDeleted: 0 },
      relations: ['user'],
      select: {
        id: true,
        userId: true,
        content: true,
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

    if (!post) {
      return null;
    }

    // Load media
    const media = await this.mediaRepository.find({
      where: {
        mediableId: post.id,
        mediableType: MediableType.POST,
        isDeleted: 0,
      },
      select: ['id', 'filePath', 'fileType', 'fileName'],
    });

    return {
      ...post,
      mediaUrls: media.map((m) => m.filePath),
    };
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    const post = await this.postRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }

    // Update post content and privacy
    const updateData: any = {
      content: updatePostDto.content,
      privacy: updatePostDto.privacy,
    };
    await this.postRepository.update(id, updateData);

    // Update media if provided
    if (updatePostDto.mediaUrls) {
      // Delete old media
      await this.mediaRepository.update(
        {
          mediableId: id,
          mediableType: MediableType.POST,
        },
        {
          isDeleted: 1,
          deletedAt: new Date(),
        },
      );

      // Create new media
      if (updatePostDto.mediaUrls.length > 0) {
        const mediaEntities = updatePostDto.mediaUrls.map((url) => {
          return this.mediaRepository.create({
            mediableId: id,
            mediableType: MediableType.POST,
            filePath: url,
            fileType: this.detectFileType(url),
          });
        });
        await this.mediaRepository.save(mediaEntities);
      }
    }

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
      where: {
        likeableId: postId,
        likeableType: LikeableType.POST,
        userId,
      },
    });

    if (existingLike) {
      throw new BadRequestException('Bạn đã thích bài viết này rồi');
    }

    // Create new like
    const like = this.likeRepository.create({
      likeableId: postId,
      likeableType: LikeableType.POST,
      userId,
    });
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
      where: {
        likeableId: postId,
        likeableType: LikeableType.POST,
        userId,
      },
    });

    if (!existingLike) {
      throw new BadRequestException('Bạn chưa thích bài viết này');
    }
    // Remove like
    await this.likeRepository.delete({
      likeableId: postId,
      likeableType: LikeableType.POST,
      userId,
    });

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
