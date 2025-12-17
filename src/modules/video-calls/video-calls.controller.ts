import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VideoCallsService } from './video-calls.service';
import { CreateVideoCallDto } from './dto/create-video-call.dto';
import { UpdateVideoCallDto } from './dto/update-video-call.dto';

@Controller('video-calls')
export class VideoCallsController {
  constructor(private readonly videoCallsService: VideoCallsService) {}

  @Post()
  create(@Body() createVideoCallDto: CreateVideoCallDto) {
    return this.videoCallsService.create(createVideoCallDto);
  }

  @Get()
  findAll() {
    return this.videoCallsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videoCallsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVideoCallDto: UpdateVideoCallDto) {
    return this.videoCallsService.update(+id, updateVideoCallDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.videoCallsService.remove(+id);
  }
}
