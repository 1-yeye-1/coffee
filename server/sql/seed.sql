INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('site', JSON_OBJECT('name', 'Coffee Book', 'database', 'coffee'))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
