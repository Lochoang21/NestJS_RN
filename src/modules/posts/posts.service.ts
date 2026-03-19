/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like as ILike, In } from 'typeorm';
import { Post } from './entities/post.entity';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { Media } from './entities/media.entity';
import { MediableType } from './enums/mediable-type.enum';
import { LikeableType } from './enums/likeable-type.enum';
import { FileType } from './enums/file-type.enum';
import { PostPrivacy } from './enums/post-privacy.enum';

@Injectable()
export class PostsService {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_PAGE_SIZE = 10;
  private readonly MAX_PAGE_SIZE = 100;

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
      privacy: createPostDto.privacy ?? PostPrivacy.PUBLIC,
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

  async findAll(query: string, current: number, pageSize: number, currentUserId?: number) {
    const { pageSize: size, skip } = this.normalizePagination(
      current,
      pageSize,
    );

    // Parse query parameters for filtering
    const where: any = { isDeleted: 0 };
    if (query) {
      where.content = ILike(`%${query}%`);
    }

    const [posts, totalItems] = await this.postRepository.findAndCount({
      where,
      take: size,
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

    const result = await this.enrichPosts(posts, currentUserId);

    const totalPage = Math.ceil(totalItems / size);

    return { result, totalPage };
  }

  async findByAuthor(userId: number, query: string, current: number, pageSize: number, currentUserId?: number) {
    const { pageSize: size, skip } = this.normalizePagination(current, pageSize);

    // Build where condition
    const where: any = { userId, isDeleted: 0 };
    if (query) {
      where.content = ILike(`%${query}%`);
    }

    const [posts, totalItems] = await this.postRepository.findAndCount({
      where,
      take: size,
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

    const result = await this.enrichPosts(posts, currentUserId);

    const totalPage = Math.ceil(totalItems / size);

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

  async findOne(id: number, currentUserId?: number): Promise<any> {
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
      throw new NotFoundException('Bài viết không tồn tại');
    }

    const [result] = await this.enrichPosts([post], currentUserId);
    return result;
  }

  async update(id: number, updatePostDto: UpdatePostDto, currentUserId: number) {
    const post = await this.postRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!post) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    if (post.userId !== currentUserId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài viết này');
    }

    // Update post content and privacy
    const updateData: Partial<Post> = {};
    if (typeof updatePostDto.content === 'string') {
      updateData.content = updatePostDto.content;
    }

    if (updatePostDto.privacy) {
      updateData.privacy = updatePostDto.privacy;
    }

    if (Object.keys(updateData).length > 0) {
      await this.postRepository.update(id, updateData);
    }

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

  async remove(id: number, currentUserId: number) {
    const post = await this.postRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!post) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    if (post.userId !== currentUserId) {
      throw new ForbiddenException('Bạn không có quyền xoá bài viết này');
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
      return { message: 'Bạn đã thích bài viết này trước đó', liked: true };
    }

    // Create new like
    const like = this.likeRepository.create({
      likeableId: postId,
      likeableType: LikeableType.POST,
      userId,
    });
    await this.likeRepository.save(like);

    return { message: 'Đã thích bài viết', liked: true };
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
      return { message: 'Bài viết chưa được thích trước đó', liked: false };
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

    // Validate parent comment if provided
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentCommentId, isDeleted: 0 },
      });

      if (!parentComment) {
        throw new BadRequestException('Bình luận cha không tồn tại');
      }

      // Convert both to number for comparison
      if (Number(parentComment.postId) !== Number(postId)) {
        throw new BadRequestException('Bình luận cha không thuộc bài viết này');
      }
    }

    const comment = this.commentRepository.create({
      postId,
      userId,
      content,
      parentCommentId: parentCommentId || null
    });
    await this.commentRepository.save(comment);
    return { message: 'Bình luận bài viết thành công' };
  }

  async deleteComment(commentId: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, isDeleted: 0 },
    });
    if (!comment) {
      throw new NotFoundException('Bình luận không tồn tại');
    }

    if (comment.userId !== userId) {
      const post = await this.postRepository.findOne({
        where: { id: comment.postId, isDeleted: 0 },
        select: ['id', 'userId'],
      });

      if (!post || post.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền xoá bình luận này');
      }
    }

    await this.commentRepository.update(commentId, {
      isDeleted: 1,
      deletedAt: new Date(),
    });

    return { message: 'Đã xoá bình luận' };
  }

  private normalizePagination(current: number, pageSize: number) {
    const normalizedCurrent = Number.isFinite(current) && current > 0
      ? Math.floor(current)
      : this.DEFAULT_PAGE;

    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), this.MAX_PAGE_SIZE)
      : this.DEFAULT_PAGE_SIZE;

    return {
      current: normalizedCurrent,
      pageSize: normalizedPageSize,
      skip: (normalizedCurrent - 1) * normalizedPageSize,
    };
  }

  private async enrichPosts(posts: any[], currentUserId?: number) {
    if (posts.length === 0) {
      return [];
    }

    const postIds = posts.map((post) => Number(post.id));

    const [mediaList, likeStatRows, comments, currentUserLikes] = await Promise.all([
      this.mediaRepository.find({
        where: {
          mediableId: In(postIds),
          mediableType: MediableType.POST,
          isDeleted: 0,
        },
        select: ['id', 'mediableId', 'filePath', 'fileType', 'fileName'],
      }),
      this.likeRepository
        .createQueryBuilder('like')
        .select('like.likeable_id', 'postId')
        .addSelect('COUNT(*)', 'likesCount')
        .where('like.likeable_type = :type', { type: LikeableType.POST })
        .andWhere('like.likeable_id IN (:...postIds)', { postIds })
        .groupBy('like.likeable_id')
        .getRawMany(),
      this.commentRepository.find({
        where: {
          postId: In(postIds),
          isDeleted: 0,
        },
        relations: ['user'],
        select: {
          id: true,
          postId: true,
          userId: true,
          parentCommentId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          user: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        order: { createdAt: 'ASC' },
      }),
      currentUserId
        ? this.likeRepository.find({
          where: {
            userId: currentUserId,
            likeableType: LikeableType.POST,
            likeableId: In(postIds),
          },
          select: ['likeableId'],
        })
        : Promise.resolve([]),
    ]);

    const mediaMap = new Map<number, Media[]>();
    for (const media of mediaList) {
      const key = Number(media.mediableId);
      if (!mediaMap.has(key)) {
        mediaMap.set(key, []);
      }
      mediaMap.get(key)?.push(media);
    }

    const likesMap = new Map<number, number>();
    for (const row of likeStatRows) {
      likesMap.set(Number(row.postId), Number(row.likesCount));
    }

    const commentsMap = new Map<number, Comment[]>();
    for (const comment of comments) {
      const key = Number(comment.postId);
      if (!commentsMap.has(key)) {
        commentsMap.set(key, []);
      }
      commentsMap.get(key)?.push(comment);
    }

    const likedSet = new Set<number>(
      currentUserLikes.map((like) => Number(like.likeableId)),
    );

    return posts.map((post) => {
      const postId = Number(post.id);
      const postComments = commentsMap.get(postId) ?? [];
      return {
        ...post,
        mediaUrls: (mediaMap.get(postId) ?? []).map((m) => m.filePath),
        likesCount: likesMap.get(postId) ?? 0,
        isLiked: likedSet.has(postId),
        comments: postComments,
        commentsCount: postComments.length,
      };
    });
  }
}
