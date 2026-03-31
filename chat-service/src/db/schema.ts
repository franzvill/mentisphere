import { pgTable, uuid, text, integer, timestamp, index, unique, customType } from 'drizzle-orm/pg-core';

// Custom pgvector column type for Drizzle
const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown) {
    return JSON.parse(value as string);
  },
});

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  mwUserId: integer('mw_user_id').notNull(),
  mwUsername: text('mw_username').notNull(),
  agentPageTitle: text('agent_page_title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_sessions_user').on(table.mwUserId),
  index('idx_sessions_agent').on(table.agentPageTitle),
]);

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  mwUserId: integer('mw_user_id').notNull(),
  mwUsername: text('mw_username').notNull(),
  title: text('title').notNull().default('New conversation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_conversations_user').on(table.mwUserId),
]);

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  agentPageTitle: text('agent_page_title'),
  rating: text('rating', { enum: ['helpful', 'not_helpful'] }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_messages_session').on(table.sessionId),
]);

export const knowledgeEmbeddings = pgTable('knowledge_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  pageTitle: text('page_title').notNull(),
  pageRevisionId: integer('page_revision_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: vector('embedding').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_embeddings_page').on(table.pageTitle),
  unique('uq_embeddings_chunk').on(table.pageTitle, table.pageRevisionId, table.chunkIndex),
]);

export const skillRegistry = pgTable('skill_registry', {
  pageTitle: text('page_title').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const agentEmbeddings = pgTable('agent_embeddings', {
  pageTitle: text('page_title').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  embedding: vector('embedding').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const agentStats = pgTable('agent_stats', {
  agentPageTitle: text('agent_page_title').primaryKey(),
  totalSessions: integer('total_sessions').default(0).notNull(),
  totalMessages: integer('total_messages').default(0).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  notHelpfulCount: integer('not_helpful_count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
