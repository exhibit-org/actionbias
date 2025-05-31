ALTER TABLE "nodes" RENAME TO "actions";--> statement-breakpoint
ALTER TABLE "edges" DROP CONSTRAINT "edges_src_nodes_id_fk";
--> statement-breakpoint
ALTER TABLE "edges" DROP CONSTRAINT "edges_dst_nodes_id_fk";
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_src_actions_id_fk" FOREIGN KEY ("src") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_dst_actions_id_fk" FOREIGN KEY ("dst") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;