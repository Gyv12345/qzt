-- Add tasks module table

CREATE TABLE `tasks` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'todo',
  `label` VARCHAR(50) NOT NULL DEFAULT 'feature',
  `priority` VARCHAR(50) NOT NULL DEFAULT 'medium',
  `dueDate` DATETIME(3) NULL,
  `assigneeId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `tasks_status_idx`(`status`),
  INDEX `tasks_priority_idx`(`priority`),
  INDEX `tasks_assigneeId_idx`(`assigneeId`),
  INDEX `tasks_createdById_idx`(`createdById`),
  CONSTRAINT `tasks_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tasks_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
