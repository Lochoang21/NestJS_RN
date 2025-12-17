import { Injectable } from '@nestjs/common';
import { CreateVideoCallDto } from './dto/create-video-call.dto';
import { UpdateVideoCallDto } from './dto/update-video-call.dto';

@Injectable()
export class VideoCallsService {
  create(createVideoCallDto: CreateVideoCallDto) {
    return 'This action adds a new videoCall';
  }

  findAll() {
    return `This action returns all videoCalls`;
  }

  findOne(id: number) {
    return `This action returns a #${id} videoCall`;
  }

  update(id: number, updateVideoCallDto: UpdateVideoCallDto) {
    return `This action updates a #${id} videoCall`;
  }

  remove(id: number) {
    return `This action removes a #${id} videoCall`;
  }
}
