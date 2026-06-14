CREATE DATABASE IF NOT EXISTS coffee
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE coffee;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  nickname VARCHAR(120) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(500) NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'user',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  points INT NOT NULL DEFAULT 0,
  level VARCHAR(50) NOT NULL DEFAULT '普通会员',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_status (status),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS books (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  rating DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  stock INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  cover_tone VARCHAR(50) NULL,
  summary TEXT NULL,
  description TEXT NULL,
  isbn VARCHAR(80) NULL,
  publisher VARCHAR(255) NULL,
  year SMALLINT UNSIGNED NULL,
  pages INT UNSIGNED NULL,
  language VARCHAR(80) NULL,
  author_bio TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_books_slug (slug),
  KEY idx_books_category (category),
  KEY idx_books_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  stock INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  sales INT NOT NULL DEFAULT 0,
  flavor JSON NULL,
  origin VARCHAR(255) NULL,
  roast VARCHAR(100) NULL,
  description TEXT NULL,
  scene TEXT NULL,
  storage TEXT NULL,
  tone VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_products_slug (slug),
  KEY idx_products_category (category),
  KEY idx_products_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(190) NOT NULL,
  setting_value JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_settings_key (setting_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id BIGINT UNSIGNED NULL,
  action VARCHAR(190) NOT NULL,
  module VARCHAR(100) NOT NULL,
  payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_module (module),
  KEY idx_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_operator
    FOREIGN KEY (operator_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  session_id VARCHAR(190) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_carts_user_id (user_id),
  KEY idx_carts_user_id (user_id),
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  selected TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cart_items_cart_product (cart_id, product_id),
  KEY idx_cart_items_cart_id (cart_id),
  KEY idx_cart_items_product_id (product_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_no VARCHAR(80) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  receiver_name VARCHAR(120) NULL,
  receiver_phone VARCHAR(40) NULL,
  delivery_type VARCHAR(30) NOT NULL,
  pickup_store VARCHAR(120) NULL,
  address_region VARCHAR(255) NULL,
  address_detail VARCHAR(500) NULL,
  payment_method VARCHAR(50) NOT NULL,
  coupon_code VARCHAR(80) NULL,
  points_used INT NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  points_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_orders_order_no (order_no),
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_status (status),
  KEY idx_orders_created_at (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100) NULL,
  product_image_tone VARCHAR(50) NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_product_id (product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_no VARCHAR(80) NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_payment_no (payment_no),
  KEY idx_payments_order_id (order_id),
  KEY idx_payments_status (status),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  event_time VARCHAR(80) NOT NULL,
  location VARCHAR(255) NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  attendees INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  tone VARCHAR(50) NULL,
  summary TEXT NULL,
  description TEXT NULL,
  speaker JSON NULL,
  agenda JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_events_slug (slug),
  KEY idx_events_date (event_date),
  KEY idx_events_status (status),
  KEY idx_events_category (category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_registrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'registered',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_event_registrations_event_user (event_id, user_id),
  KEY idx_event_registrations_user (user_id),
  KEY idx_event_registrations_status (status),
  CONSTRAINT fk_event_registrations_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_registrations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(120) NOT NULL,
  avatar VARCHAR(20) NULL,
  topic VARCHAR(100) NOT NULL,
  excerpt VARCHAR(500) NULL,
  content TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_slug (slug),
  KEY idx_posts_status (status),
  KEY idx_posts_topic (topic),
  KEY idx_posts_created_at (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  author VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_post (post_id),
  KEY idx_comments_status (status),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_likes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_likes_post_user (post_id, user_id),
  KEY idx_post_likes_user (user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS spaces (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT NULL,
  capacity INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_spaces_slug (slug),
  KEY idx_spaces_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_slots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  space_id BIGINT UNSIGNED NOT NULL,
  slot_date DATE NOT NULL,
  slot_time VARCHAR(80) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_booking_slots_space_date_time (space_id, slot_date, slot_time),
  KEY idx_booking_slots_date (slot_date),
  KEY idx_booking_slots_status (status),
  CONSTRAINT fk_booking_slots_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_no VARCHAR(80) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  space_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NULL,
  booking_date DATE NOT NULL,
  booking_time VARCHAR(80) NOT NULL,
  seat VARCHAR(30) NULL,
  contact_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  note TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bookings_booking_no (booking_no),
  KEY idx_bookings_user (user_id),
  KEY idx_bookings_space (space_id),
  KEY idx_bookings_date (booking_date),
  KEY idx_bookings_status (status),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_slot FOREIGN KEY (slot_id) REFERENCES booking_slots(id) ON DELETE SET NULL
) ENGINE=InnoDB;
