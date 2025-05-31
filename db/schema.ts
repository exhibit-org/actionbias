import { pgTable, uuid, text, jsonb, integer, primaryKey } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Zod schema for nodes.data field
export const nodeDataSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export type NodeData = z.infer<typeof nodeDataSchema>;

export const nodes = pgTable('nodes', {
  id: uuid('id').primaryKey(),
  type: text('type'),
  data: jsonb('data').$type<NodeData>(),
  version: integer('version').default(0),
});

export const edges = pgTable('edges', {
  src: uuid('src').references(() => nodes.id, { onDelete: 'cascade' }),
  dst: uuid('dst').references(() => nodes.id, { onDelete: 'cascade' }),
  kind: text('kind'),
}, (table) => ({
  pk: primaryKey({ columns: [table.src, table.dst, table.kind] }),
}));