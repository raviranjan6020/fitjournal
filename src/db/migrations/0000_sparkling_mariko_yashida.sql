CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"auth_provider" text DEFAULT 'google',
	"auth_provider_id" text,
	"height_cm" numeric(5, 1),
	"date_of_birth" date,
	"gender" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_auth_provider_id_unique" UNIQUE("auth_provider_id")
);
--> statement-breakpoint
CREATE TABLE "users_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_type" text NOT NULL,
	"target_weight_kg" numeric(5, 1),
	"start_weight_kg" numeric(5, 1),
	"start_date" date,
	"target_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"protein_target_g" numeric,
	"water_target_l" numeric(3, 1) DEFAULT '2.5',
	"weekly_workout_target" numeric DEFAULT '4',
	"report_day" text DEFAULT 'sunday',
	"delivery_email" boolean DEFAULT true NOT NULL,
	"delivery_whatsapp" boolean DEFAULT false NOT NULL,
	"delivery_push" boolean DEFAULT true NOT NULL,
	"whatsapp_number" text,
	"push_subscription" jsonb,
	"coach_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "exercise_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"muscle_groups" text[] DEFAULT '{}' NOT NULL,
	"equipment" text,
	"is_compound" boolean DEFAULT false,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_library_name_unique" UNIQUE("name"),
	CONSTRAINT "exercise_library_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workout_exercise_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"workout_type" text NOT NULL,
	"name" text,
	"duration_min" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_log_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"reps" integer NOT NULL,
	"rpe" numeric(3, 1),
	"is_warmup" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"weight_kg" numeric(5, 2),
	"body_fat_pct" numeric(4, 1),
	"waist_cm" numeric(5, 1),
	"chest_cm" numeric(5, 1),
	"left_arm_cm" numeric(4, 1),
	"right_arm_cm" numeric(4, 1),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "body_metrics_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"hours" numeric(3, 1) NOT NULL,
	"quality" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sleep_logs_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "nutrition_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"protein_g" integer,
	"water_l" numeric(3, 1),
	"calories" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nutrition_logs_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"snapshot_date" text NOT NULL,
	"period_start" text,
	"period_end" text,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_snapshots_user_id_snapshot_date_unique" UNIQUE("user_id","snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_logs_report_id_channel_unique" UNIQUE("report_id","channel")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"report_type" text DEFAULT 'weekly' NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"snapshot_id" uuid,
	"content" jsonb NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_user_id_report_type_period_end_unique" UNIQUE("user_id","report_type","period_end")
);
--> statement-breakpoint
ALTER TABLE "users_goals" ADD CONSTRAINT "users_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_preferences" ADD CONSTRAINT "users_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_library" ADD CONSTRAINT "exercise_library_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise_logs" ADD CONSTRAINT "workout_exercise_logs_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise_logs" ADD CONSTRAINT "workout_exercise_logs_exercise_id_exercise_library_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise_library"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_log_id_workout_exercise_logs_id_fk" FOREIGN KEY ("exercise_log_id") REFERENCES "public"."workout_exercise_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_snapshot_id_analytics_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."analytics_snapshots"("id") ON DELETE no action ON UPDATE no action;