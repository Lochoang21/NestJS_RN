import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @IsNotEmpty({ message: 'Nội dung bài viết không được để trống' })
  content: string;

  @IsOptional()
  mediaUrls?: string[];

  @IsOptional()
  privacy?: string;
}
