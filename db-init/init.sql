CREATE DATABASE IF NOT EXISTS `bestellservice` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bestellservice`;

CREATE TABLE IF NOT EXISTS `produkt_kategorien` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `test_produkte` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `price` DECIMAL(10, 2) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `product_category` INT NOT NULL,
    FOREIGN KEY (`product_category`) REFERENCES `produkt_kategorien`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initiale Kategorien anlegen
INSERT INTO `produkt_kategorien` (`name`) VALUES 
('Getränke'),
('Essen'),
('Sonstiges');

-- Initiale Produkte anlegen
INSERT INTO `test_produkte` (`name`, `price`, `product_category`) VALUES 
('Helles', 4.50, 1),
('Weißbier', 4.80, 1),
('Cola', 3.50, 1),
('Spezi', 3.50, 1),
('Wasser Medium', 3.00, 1),
('Weinschorle', 5.00, 1),
('Mojito', 8.50, 2),
('Caipirinha', 8.50, 2),
('Gin Tonic', 7.50, 2),
('Brezel', 2.50, 3),
('Chips', 2.00, 3);
