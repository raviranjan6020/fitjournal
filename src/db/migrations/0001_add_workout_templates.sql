CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"workout_type" text NOT NULL,
	"exercise_ids" uuid[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_templates_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;