# Ayurvedic Store Backend Schema (MVP)

This document defines the MVP database schema for the Ayurvedic Store backend using PostgreSQL. It covers users, products, carts, and orders.

## Tables

### users

- id: uuid (PK)
- name: varchar(100) not null
- email: varchar(255) not null unique
- password_hash: varchar(255) not null
- created_at: timestamp not null default now()
- updated_at: timestamp not null default now()

### products

- id: uuid (PK)
- name: varchar(150) not null
- category: varchar(50) not null
- price: integer not null -- stored in paise
- rating: numeric(2,1) not null default 0
- reviews: integer not null default 0
- doshas: text[] not null default '{}' -- e.g., ['vata','pitta']
- description: text not null
- benefits: text[] not null default '{}'
- in_stock: boolean not null default true
- created_at: timestamp not null default now()
- updated_at: timestamp not null default now()

### cart_items

- id: uuid (PK)
- user_id: uuid (FK -> users.id) not null
- product_id: uuid (FK -> products.id) not null
- quantity: integer not null default 1
- created_at: timestamp not null default now()
- updated_at: timestamp not null default now()

Unique constraint:

- (user_id, product_id)

### orders

- id: uuid (PK)
- user_id: uuid (FK -> users.id) not null
- total_amount: integer not null -- stored in paise
- status: varchar(20) not null default 'PENDING'
- created_at: timestamp not null default now()
- updated_at: timestamp not null default now()

### order_items

- id: uuid (PK)
- order_id: uuid (FK -> orders.id) not null
- product_id: uuid (FK -> products.id) not null
- quantity: integer not null
- price_snapshot: integer not null -- stored in paise
- created_at: timestamp not null default now()

## Enums (optional)

If you want stricter validation, you can add enums:

- product_category: herbs, oils, supplements, teas, skincare, books
- order_status: PENDING, PAID, CANCELLED, FAILED

## Indexes

- users(email)
- products(category)
- cart_items(user_id)
- orders(user_id)
- order_items(order_id)

## Notes

- Money values are stored in paise to avoid floating-point issues.
- doshas and benefits are arrays to match the UI data.
- You can add product images with a separate product_images table later.
