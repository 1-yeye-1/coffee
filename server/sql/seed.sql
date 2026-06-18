INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('site', JSON_OBJECT('name', 'Coffee Book', 'database', DATABASE()))
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
