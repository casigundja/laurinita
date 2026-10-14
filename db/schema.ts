// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),role:text('role').notNull().default('customer'),created:text('created').notNull()});
export const products = sqliteTable('products', {id:text('id').primaryKey(),name:text('name').notNull(),category:text('category').notNull(),description:text('description').notNull(),price:integer('price').notNull(),stock:integer('stock').notNull().default(0),minimum:integer('minimum').notNull().default(5),image:text('image').notNull(),active:integer('active').notNull().default(1)});
export const orders = sqliteTable('orders', {id:text('id').primaryKey(),userId:text('user_id').notNull(),customer:text('customer').notNull(),address:text('address').notNull(),total:integer('total').notNull(),status:text('status').notNull().default('Pendente'),created:text('created').notNull(),requestKey:text('request_key').notNull().unique()});
export const items = sqliteTable('items', {id:text('id').primaryKey(),orderId:text('order_id').notNull(),productId:text('product_id').notNull(),name:text('name').notNull(),quantity:integer('quantity').notNull(),price:integer('price').notNull()});
export const movements = sqliteTable('movements', {id:text('id').primaryKey(),productId:text('product_id').notNull(),delta:integer('delta').notNull(),reason:text('reason').notNull(),actor:text('actor').notNull(),created:text('created').notNull(),orderId:text('order_id'),eventKey:text('event_key').notNull().unique()});
