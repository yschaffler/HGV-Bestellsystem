SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS `bestellservice` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bestellservice`;

CREATE TABLE IF NOT EXISTS `produkt_kategorien` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `color` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `test_produkte` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `price` DECIMAL(10, 2) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `product_category` INT NOT NULL,
    FOREIGN KEY (`product_category`) REFERENCES `produkt_kategorien`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rechnungen: zentrale Tabelle für alle Buchungen (Kellner + Bar)
-- typ: 'RECHNUNG' = normale Bestellung, 'STORNO' = Warenretoure (negative Beträge)
-- tisch: Tischnummer (0 = Barkasse)
CREATE TABLE IF NOT EXISTS `rechnungen` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tisch` INT NOT NULL,
    `typ` VARCHAR(10) NOT NULL DEFAULT 'RECHNUNG',
    `erstellt_am` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `gesamt` DECIMAL(10,2) NOT NULL,
    `positionen` JSON NOT NULL,
    `kellner_id` VARCHAR(50) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Migration for existing DBs: ALTER TABLE rechnungen ADD COLUMN kellner_id VARCHAR(50) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS `user` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(15) NOT NULL,
    `name` VARCHAR(50),
    `password` VARCHAR(100) NOT NULL,
    `role` VARCHAR(15)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Druckereinstellungen (immer genau eine Zeile, id=1)
CREATE TABLE IF NOT EXISTS `printer_settings` (
    `id`           INT NOT NULL DEFAULT 1,
    `settings_json` JSON NOT NULL,
    `updated_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `printer_settings` (`id`, `settings_json`) VALUES (
    1,
    '{"printBarOrders":true,"rules":[{"id":"1","tableFrom":1,"tableTo":99,"barName":"Bar 1"}]}'
);

-- Initialen Admin-Nutzer anlegen (Passwort: admin)
INSERT INTO `user` (`username`, `name`, `password`, `role`) VALUES
('admin', 'Administrator', 'jGl25bVBBBW96Qi9Te4V37Fnqchz/Eu4qB9vKrRIqRg=', 'ADMIN');

-- Initiale Kategorien anlegen
INSERT INTO `produkt_kategorien` (`name`, `color`) VALUES
('Getränke', '#3b82f6'),
('Essen', '#ef4444'),
('Sonstiges', '#64748b');

-- Initiale Produkte anlegen
INSERT INTO `test_produkte` (`name`, `price`, `product_category`) VALUES
('Helles', 4.50, 1),
('Weißbier', 4.80, 1),
('Cola', 3.50, 1),
('Spezi', 3.50, 1),
('Wasser Medium', 3.00, 1),
('Weinschorle', 5.00, 1),
('Schnitzel', 13.50, 2),
('Pommes', 5.50, 2),
('Kaiserschmarn', 12.50, 2),
('Ketchup', 0.50, 3),
('Mayonnaise', 0.50, 3);
