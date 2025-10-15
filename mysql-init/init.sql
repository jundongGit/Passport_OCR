-- Create database if not exists
CREATE DATABASE IF NOT EXISTS passport_ocr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE passport_ocr;

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create visitors table
CREATE TABLE IF NOT EXISTS `visitors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chineseName` varchar(255) DEFAULT NULL,
  `englishName` varchar(255) DEFAULT NULL,
  `passportNumber` varchar(255) NOT NULL,
  `nationality` varchar(255) DEFAULT NULL,
  `dateOfBirth` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `passportExpiryDate` date DEFAULT NULL,
  `visaType` varchar(255) DEFAULT NULL,
  `visaExpiryDate` date DEFAULT NULL,
  `entryDate` date DEFAULT NULL,
  `checkInDate` datetime DEFAULT NULL,
  `checkOutDate` datetime DEFAULT NULL,
  `roomNumber` varchar(50) DEFAULT NULL,
  `contactNumber` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text,
  `emergencyContact` varchar(255) DEFAULT NULL,
  `emergencyPhone` varchar(50) DEFAULT NULL,
  `notes` text,
  `passportImagePath` varchar(255) DEFAULT NULL,
  `visaImagePath` varchar(255) DEFAULT NULL,
  `createdBy` int DEFAULT NULL,
  `updatedBy` int DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `passportNumber` (`passportNumber`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`),
  CONSTRAINT `visitors_ibfk_1` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `visitors_ibfk_2` FOREIGN KEY (`updatedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admin user (password: admin123)
-- Password hash for 'admin123' using bcryptjs
INSERT INTO `users` (`username`, `email`, `password`, `role`)
VALUES ('admin', 'admin@passport.com', '$2a$10$rVWQqWqH9bO6mXkJZz4fBe8YXqVH2ZqYQqXqXqXqXqXqXqXqXqXqX', 'admin')
ON DUPLICATE KEY UPDATE username=username;

-- Grant privileges
GRANT ALL PRIVILEGES ON passport_ocr.* TO 'passport_user'@'%';
FLUSH PRIVILEGES;
