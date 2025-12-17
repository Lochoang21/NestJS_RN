import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty({ message: 'Nội dung bài viết không được để trống' })
  content: string;

  @IsOptional()
  mediaUrls?: string[];

  @IsOptional()
  privacy?: string;
}
