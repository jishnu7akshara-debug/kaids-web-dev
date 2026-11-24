CREATE TYPE "public"."client_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"logo_key" text,
	"logo_w" integer,
	"logo_h" integer,
	"show_home_strip" boolean DEFAULT false NOT NULL,
	"show_logo_grid" boolean DEFAULT false NOT NULL,
	"show_name_list" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "client_status" DEFAULT 'published' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
