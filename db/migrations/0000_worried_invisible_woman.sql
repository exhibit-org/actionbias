CREATE TABLE "edges" (
	"src" uuid,
	"dst" uuid,
	"kind" text,
	CONSTRAINT "edges_src_dst_kind_pk" PRIMARY KEY("src","dst","kind")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text,
	"data" jsonb,
	"version" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_src_nodes_id_fk" FOREIGN KEY ("src") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_dst_nodes_id_fk" FOREIGN KEY ("dst") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;