-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th12 17, 2025 lúc 08:10 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `we_connect`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `comments`
--

CREATE TABLE `comments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `parent_comment_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Cho phép reply comment',
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `conversations`
--

CREATE TABLE `conversations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `conversation_type` enum('one_to_one','group') DEFAULT 'one_to_one',
  `name` varchar(200) DEFAULT NULL COMMENT 'Tên nhóm chat (nếu là group chat)',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT 'Avatar nhóm chat',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Người tạo conversation',
  `last_message_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Tin nhắn cuối cùng trong cuộc hội thoại',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `conversations`
--

INSERT INTO `conversations` (`id`, `conversation_type`, `name`, `avatar_url`, `created_by`, `created_at`, `updated_at`, `is_deleted`, `deleted_at`) VALUES
(1, 'one_to_one', NULL, NULL, NULL, '2025-12-15 07:21:05', '2025-12-15 07:21:05', 0, NULL),
(2, 'one_to_one', NULL, NULL, NULL, '2025-12-15 07:21:05', '2025-12-15 07:21:05', 0, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `conversation_participants`
--

CREATE TABLE `conversation_participants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `conversation_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role` enum('admin','member') DEFAULT 'member' COMMENT 'Vai trò trong nhóm chat',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_read_at` timestamp NULL DEFAULT NULL COMMENT 'Lần cuối đọc tin nhắn',
  `is_deleted` tinyint(1) DEFAULT 0 COMMENT 'Đã rời khỏi conversation',
  `left_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `friends`
--

CREATE TABLE `friends` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id_1` bigint(20) UNSIGNED NOT NULL COMMENT 'User ID nhỏ hơn',
  `user_id_2` bigint(20) UNSIGNED NOT NULL COMMENT 'User ID lớn hơn',
  `status` enum('pending','accepted','blocked') DEFAULT 'pending',
  `action_user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'User thực hiện hành động gần nhất',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `groups`
--

CREATE TABLE `groups` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `cover_url` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `privacy` enum('public','private','secret') DEFAULT 'public',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `group_comments`
--

CREATE TABLE `group_comments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `group_post_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `parent_comment_id` bigint(20) UNSIGNED DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `group_members`
--

CREATE TABLE `group_members` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `group_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role` enum('admin','moderator','member') DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `group_posts`
--

CREATE TABLE `group_posts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `group_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `likes`
--

CREATE TABLE `likes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `likeable_id` bigint(20) UNSIGNED NOT NULL COMMENT 'ID của bài viết/bình luận/group post',
  `likeable_type` enum('Post','Comment','GroupPost','GroupComment') NOT NULL COMMENT 'Loại đối tượng được like',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `media`
--

CREATE TABLE `media` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `mediable_id` bigint(20) UNSIGNED NOT NULL COMMENT 'ID của post/message/group_post',
  `mediable_type` enum('Post','Message','GroupPost') NOT NULL COMMENT 'Loại đối tượng chứa media',
  `file_path` varchar(500) NOT NULL COMMENT 'Đường dẫn lưu file',
  `file_name` varchar(255) DEFAULT NULL COMMENT 'Tên file gốc',
  `file_type` enum('image','video','audio','file','sticker') NOT NULL COMMENT 'Loại file',
  `file_size` int(10) UNSIGNED DEFAULT NULL COMMENT 'Kích thước file (bytes)',
  `mime_type` varchar(100) DEFAULT NULL COMMENT 'MIME type của file',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `messages`
--

CREATE TABLE `messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `conversation_id` bigint(20) UNSIGNED NOT NULL,
  `sender_id` bigint(20) UNSIGNED NOT NULL,
  `message_type` enum('text','image','video','file','audio','sticker','link') DEFAULT 'text',
  `content` text DEFAULT NULL COMMENT 'Nội dung tin nhắn text',
  `reply_to_message_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Trả lời tin nhắn nào',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Người nhận thông báo',
  `actor_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Người thực hiện hành động',
  `type` enum('like','comment','friend_request','friend_accept','group_invite','mention','video_call') NOT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'ID của post/comment/request tương ứng',
  `reference_type` enum('Post','Comment','Group','GroupPost','GroupComment','User','VideoCall') DEFAULT NULL COMMENT 'Loại đối tượng mà reference_id trỏ tới',
  `content` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `posts`
--

CREATE TABLE `posts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `content` text NOT NULL,
  `privacy` enum('public','friends','private') NOT NULL DEFAULT 'public',
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `posts`
--

INSERT INTO `posts` (`id`, `user_id`, `content`, `privacy`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES
(6, 4, '438297', 'public', 0, NULL, '2025-12-17 09:58:01.518301', '2025-12-17 09:58:01.518301'),
(7, 4, 'Đây là bài viết thứ 200', 'public', 0, NULL, '2025-12-17 10:02:55.140401', '2025-12-17 11:02:48.000000'),
(8, 4, 'Đây là bài viết thứ 5', 'public', 0, NULL, '2025-12-17 10:03:03.164418', '2025-12-17 11:00:48.000000'),
(9, 4, 'Đây là bài viết thứ 2', 'public', 0, NULL, '2025-12-17 10:13:30.286484', '2025-12-17 10:13:30.286484');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL COMMENT 'Thông tin giới thiệu trang cá nhân',
  `isActive` tinyint(4) NOT NULL DEFAULT 0,
  `codeId` varchar(255) DEFAULT NULL,
  `codeExpired` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `phone` varchar(255) DEFAULT NULL,
  `refreshToken` varchar(255) DEFAULT NULL,
  `last_active_at` timestamp NULL DEFAULT NULL COMMENT 'Lần hoạt động gần nhất'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `address`, `image`, `isActive`, `codeId`, `codeExpired`, `createdAt`, `updatedAt`, `phone`, `refreshToken`) VALUES
(4, 'David Bao Loc', 'lochoang2101@gmail.com', '$2b$10$xv1kBKBd0YFeZf/pvTdGTORLbQvlp01xfGKfeMebVWxHqTCiyRVRW', NULL, NULL, 1, '837597', '2025-12-15 16:08:21', '2025-12-15 16:02:26.124089', '2025-12-17 10:59:30.000000', NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImxvY2hvYW5nMjEwMUBnbWFpbC5jb20iLCJzdWIiOjQsImlhdCI6MTc2NTk0Mzk3MCwiZXhwIjoxNzY2NTQ4NzcwfQ.i8y6vKIC_V3zmM6Pqv1RNOquetx6sY_d3e_uBWACudE');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_tokens`
--

CREATE TABLE `user_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `refresh_token` varchar(255) NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_revoked` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `video_calls`
--

CREATE TABLE `video_calls` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `call_id` varchar(100) NOT NULL COMMENT 'UUID cho room video call',
  `initiator_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Người bắt đầu cuộc gọi',
  `call_type` enum('one_to_one','group') DEFAULT 'one_to_one',
  `status` enum('initiated','ongoing','ended','cancelled') DEFAULT 'initiated',
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `ended_at` timestamp NULL DEFAULT NULL,
  `duration_seconds` int(10) UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `video_call_participants`
--

CREATE TABLE `video_call_participants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `call_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `left_at` timestamp NULL DEFAULT NULL,
  `status` enum('joined','left','declined') DEFAULT 'joined'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_parent_comment_id` (`parent_comment_id`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Chỉ mục cho bảng `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation_type` (`conversation_type`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_updated_at` (`updated_at`),
  ADD KEY `idx_last_message_id` (`last_message_id`);

--
-- Chỉ mục cho bảng `conversation_participants`
--
ALTER TABLE `conversation_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_participant` (`conversation_id`,`user_id`),
  ADD KEY `idx_conversation_id` (`conversation_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_last_read_at` (`last_read_at`);

--
-- Chỉ mục cho bảng `friends`
--
ALTER TABLE `friends`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_friendship` (`user_id_1`,`user_id_2`),
  ADD KEY `idx_user_id_1` (`user_id_1`),
  ADD KEY `idx_user_id_2` (`user_id_2`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `fk_friends_action_user` (`action_user_id`);

--
-- Chỉ mục cho bảng `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_privacy` (`privacy`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Chỉ mục cho bảng `group_comments`
--
ALTER TABLE `group_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_group_post_id` (`group_post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_parent_comment_id` (`parent_comment_id`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Chỉ mục cho bảng `group_members`
--
ALTER TABLE `group_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_membership` (`group_id`,`user_id`),
  ADD KEY `idx_group_id` (`group_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_role` (`role`);

--
-- Chỉ mục cho bảng `group_posts`
--
ALTER TABLE `group_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_group_id` (`group_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_deleted` (`is_deleted`);

--
-- Chỉ mục cho bảng `likes`
--
ALTER TABLE `likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_like` (`user_id`,`likeable_id`,`likeable_type`),
  ADD KEY `idx_likeable` (`likeable_id`,`likeable_type`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Chỉ mục cho bảng `media`
--
ALTER TABLE `media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mediable` (`mediable_id`,`mediable_type`),
  ADD KEY `idx_file_type` (`file_type`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Chỉ mục cho bảng `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation_id` (`conversation_id`),
  ADD KEY `idx_sender_id` (`sender_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_message_type` (`message_type`),
  ADD KEY `idx_reply_to_message_id` (`reply_to_message_id`);

--
-- Chỉ mục cho bảng `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_composite_user_read` (`user_id`,`is_read`,`created_at`),
  ADD KEY `fk_notifications_actor` (`actor_id`),
  ADD KEY `idx_reference` (`reference_type`,`reference_id`);

--
-- Chỉ mục cho bảng `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_c4f9a7bd77b489e711277ee5986` (`user_id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  ADD KEY `idx_last_active_at` (`last_active_at`);

--
-- Chỉ mục cho bảng `user_tokens`
--
ALTER TABLE `user_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_tokens_user_id` (`user_id`),
  ADD KEY `idx_user_tokens_refresh_token` (`refresh_token`),
  ADD KEY `idx_user_tokens_is_revoked` (`is_revoked`),
  ADD KEY `idx_user_tokens_expires_at` (`expires_at`);

--
-- Chỉ mục cho bảng `video_calls`
--
ALTER TABLE `video_calls`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `call_id` (`call_id`),
  ADD KEY `idx_call_id` (`call_id`),
  ADD KEY `idx_initiator_id` (`initiator_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_started_at` (`started_at`);

--
-- Chỉ mục cho bảng `video_call_participants`
--
ALTER TABLE `video_call_participants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_call_id` (`call_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_joined_at` (`joined_at`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `comments`
--
ALTER TABLE `comments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `conversation_participants`
--
ALTER TABLE `conversation_participants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `friends`
--
ALTER TABLE `friends`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `groups`
--
ALTER TABLE `groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `group_comments`
--
ALTER TABLE `group_comments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `group_members`
--
ALTER TABLE `group_members`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `group_posts`
--
ALTER TABLE `group_posts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `likes`
--
ALTER TABLE `likes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `media`
--
ALTER TABLE `media`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `messages`
--
ALTER TABLE `messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `posts`
--
ALTER TABLE `posts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `user_tokens`
--
ALTER TABLE `user_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `video_calls`
--
ALTER TABLE `video_calls`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `video_call_participants`
--
ALTER TABLE `video_call_participants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_comments_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `fk_conversations_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_conversations_last_message` FOREIGN KEY (`last_message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `conversation_participants`
--
ALTER TABLE `conversation_participants`
  ADD CONSTRAINT `fk_conversation_participants_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_conversation_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `friends`
--
ALTER TABLE `friends`
  ADD CONSTRAINT `fk_friends_action_user` FOREIGN KEY (`action_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_friends_user1` FOREIGN KEY (`user_id_1`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_friends_user2` FOREIGN KEY (`user_id_2`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `groups`
--
ALTER TABLE `groups`
  ADD CONSTRAINT `fk_groups_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `group_comments`
--
ALTER TABLE `group_comments`
  ADD CONSTRAINT `fk_group_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `group_comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_group_comments_post` FOREIGN KEY (`group_post_id`) REFERENCES `group_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_group_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `group_members`
--
ALTER TABLE `group_members`
  ADD CONSTRAINT `fk_group_members_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_group_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `group_posts`
--
ALTER TABLE `group_posts`
  ADD CONSTRAINT `fk_group_posts_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_group_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `likes`
--
ALTER TABLE `likes`
  ADD CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `media`
--
-- Lưu ý: Không thể tạo foreign key trực tiếp cho polymorphic relationship
-- Nên sử dụng application-level validation hoặc triggers

ALTER TABLE `messages`
  ADD CONSTRAINT `fk_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_messages_reply` FOREIGN KEY (`reply_to_message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `posts`
--
ALTER TABLE `posts`
  ADD CONSTRAINT `FK_c4f9a7bd77b489e711277ee5986` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `user_tokens`
--
ALTER TABLE `user_tokens`
  ADD CONSTRAINT `fk_user_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `video_calls`
--
ALTER TABLE `video_calls`
  ADD CONSTRAINT `fk_video_calls_initiator` FOREIGN KEY (`initiator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `video_call_participants`
--
ALTER TABLE `video_call_participants`
  ADD CONSTRAINT `fk_video_participants_call` FOREIGN KEY (`call_id`) REFERENCES `video_calls` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_video_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
