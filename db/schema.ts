import { sqliteTable,text,integer } from 'drizzle-orm/sqlite-core';
export const characterSaves=sqliteTable('character_saves',{userId:text('user_id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});
