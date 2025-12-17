import { PartialType } from '@nestjs/mapped-types';
import { CreateVideoCallDto } from './create-video-call.dto';

export class UpdateVideoCallDto extends PartialType(CreateVideoCallDto) {}
