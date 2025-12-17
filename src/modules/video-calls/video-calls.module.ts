import { Module } from '@nestjs/common';
import { VideoCallsService } from './video-calls.service';
import { VideoCallsController } from './video-calls.controller';

@Module({
  controllers: [VideoCallsController],
  providers: [VideoCallsService],
})
export class VideoCallsModule {}
