// src/modules/notifications/enums/notification-type.enum.ts
export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPT = 'friend_accept',
  GROUP_INVITE = 'group_invite',
  MENTION = 'mention',
  VIDEO_CALL = 'video_call',
}

// src/modules/notifications/enums/reference-type.enum.ts
export enum ReferenceType {
  POST = 'Post',
  COMMENT = 'Comment',
  GROUP = 'Group',
  GROUP_POST = 'GroupPost',
  GROUP_COMMENT = 'GroupComment',
  USER = 'User',
  VIDEO_CALL = 'VideoCall',
}
