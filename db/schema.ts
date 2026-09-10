import { sqliteTable,text,integer,index } from 'drizzle-orm/sqlite-core';
export const characterSaves=sqliteTable('character_saves',{userId:text('user_id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});

export const playerPresence=sqliteTable('player_presence',{playerId:text('player_id').primaryKey(),scene:text('scene').notNull(),payload:text('payload').notNull(),seenAt:integer('seen_at').notNull()},table=>[index('idx_presence_scene_seen').on(table.scene,table.seenAt)]);
