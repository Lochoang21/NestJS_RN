import {
  IsArray,
  IsInt,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PostPrivacy } from '../enums/post-privacy.enum';

export class CreatePostDto {
  @IsString({ message: 'Nội dung bài viết phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung bài viết không được để trống' })
  content: string;

  @IsOptional()
  @IsArray({ message: 'mediaUrls phải là mảng' })
  @IsString({ each: true, message: 'Mỗi mediaUrl phải là chuỗi' })
  mediaUrls?: string[];

  @IsOptional()
  @IsEnum(PostPrivacy, {
    message: 'privacy chỉ nhận các giá trị: public, friends, private',
  })
  privacy?: PostPrivacy;
}

export class CreatePostCommentDto {
  @IsString({ message: 'Nội dung bình luận phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  content: string;

  @IsOptional()
  @IsInt({ message: 'parentCommentId phải là số nguyên' })
  @Min(1, { message: 'parentCommentId phải lớn hơn 0' })
  parentCommentId?: number;
}
