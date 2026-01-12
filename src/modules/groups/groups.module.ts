import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupPost } from './entities/group-post.entity';
import { GroupComment } from './entities/group-comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, GroupPost, GroupComment]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule { }
