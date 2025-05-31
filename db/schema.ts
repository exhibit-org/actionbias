import { pgTable, uuid, text, jsonb, integer, primaryKey } from 'drizzle-orm/pg-core';

export const nodes = pgTable('nodes', {
  id: uuid('id').primaryKey(),
  type: text('type'),
  data: jsonb('data'),
  version: integer('version').default(0),
});

export const edges = pgTable('edges', {
  src: uuid('src').references(() => nodes.id, { onDelete: 'cascade' }),
  dst: uuid('dst').references(() => nodes.id, { onDelete: 'cascade' }),
  kind: text('kind'),
}, (table) => ({
  pk: primaryKey({ columns: [table.src, table.dst, table.kind] }),
}));