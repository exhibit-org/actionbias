-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN "embedding_vector" vector(1536);--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN "node_summary" text;--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN "subtree_summary" text;