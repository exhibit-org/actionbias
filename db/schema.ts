import { pgTable, uuid, text, jsonb, integer, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Zod schema for actions.data field
export const actionDataSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export type ActionData = z.infer<typeof actionDataSchema>;

export const actions = pgTable('actions', {
  id: uuid('id').primaryKey(),
  data: jsonb('data').$type<ActionData>(),
  version: integer('version').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const edges = pgTable('edges', {
  src: uuid('src').references(() => actions.id, { onDelete: 'cascade' }),
  dst: uuid('dst').references(() => actions.id, { onDelete: 'cascade' }),
  kind: text('kind'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.src, table.dst, table.kind] }),
}));