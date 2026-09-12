import { sqliteTable,text,integer,index } from 'drizzle-orm/sqlite-core';
export const characterSaves=sqliteTable('character_saves',{userId:text('user_id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});

export const playerPresence=sqliteTable('player_presence',{playerId:text('player_id').primaryKey(),scene:text('scene').notNull(),payload:text('payload').notNull(),seenAt:integer('seen_at').notNull()},table=>[index('idx_presence_scene_seen').on(table.scene,table.seenAt)]);
export const gameAccounts=sqliteTable('game_accounts',{id:text('id').primaryKey(),username:text('username').notNull(),normalizedUsername:text('normalized_username').notNull().unique(),passwordHash:text('password_hash').notNull(),createdAt:integer('created_at').notNull()});
export const gameSessions=sqliteTable('game_sessions',{tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>gameAccounts.id),expiresAt:integer('expires_at').notNull()});
export const authLimits=sqliteTable('auth_limits',{key:text('key').primaryKey(),window:integer('window').notNull(),attempts:integer('attempts').notNull()});
