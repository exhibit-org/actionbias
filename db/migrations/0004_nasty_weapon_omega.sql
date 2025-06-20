-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN "embedding_vector" vector(1536);--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN "node_summary" text;--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN "subtree_summary" text;--> statement-breakpoint
-- Create IVFFLAT index for fast similarity search on embedding vectors
-- Using lists=100 as a good default for up to 1M vectors (sqrt of expected max rows)
CREATE INDEX IF NOT EXISTS idx_actions_embedding_vector_ivfflat 
ON "actions" USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);