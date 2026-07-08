CREATE TYPE "public"."admin_rank" AS ENUM('junior', 'senior', 'lead', 'master');--> statement-breakpoint
CREATE TYPE "public"."book_category" AS ENUM('Mindset & Confidence', 'Career & Wealth', 'Wellness & Self-Care', 'Relationships', 'Spirituality & Purpose', 'Leadership');--> statement-breakpoint
CREATE TYPE "public"."book_source" AS ENUM('seed', 'admin');--> statement-breakpoint
CREATE TYPE "public"."change_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."change_type" AS ENUM('create', 'update', 'delete', 'archive');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('NGN', 'USD', 'GBP', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'master_admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"category" "book_category" NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" "currency" DEFAULT 'NGN' NOT NULL,
	"cover_image" text NOT NULL,
	"file_url" text,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"rating" numeric(2, 1) DEFAULT '5.0' NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"bestseller" boolean DEFAULT false NOT NULL,
	"source" "book_source" DEFAULT 'seed' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "books_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"book_slug" text NOT NULL,
	"book_title" text NOT NULL,
	"type" "change_type" NOT NULL,
	"changes" text DEFAULT '{}' NOT NULL,
	"submitted_by" text NOT NULL,
	"submitted_by_email" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"status" "change_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"password_hash" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"username" text,
	"phone" text,
	"show_full_name" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"rank" "admin_rank",
	"title" text,
	"permissions" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" integer NOT NULL,
	"book_slug" text NOT NULL,
	"purchase_date" timestamp DEFAULT now() NOT NULL,
	"payment_reference" text,
	"released" boolean DEFAULT false NOT NULL,
	"release_at" timestamp,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_purchases" ADD CONSTRAINT "user_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_purchases" ADD CONSTRAINT "user_purchases_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "books_slug_idx" ON "books" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "books_category_idx" ON "books" USING btree ("category");--> statement-breakpoint
CREATE INDEX "books_featured_idx" ON "books" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "books_bestseller_idx" ON "books" USING btree ("bestseller");--> statement-breakpoint
CREATE INDEX "books_source_idx" ON "books" USING btree ("source");--> statement-breakpoint
CREATE INDEX "books_featured_bestseller_idx" ON "books" USING btree ("featured","bestseller");--> statement-breakpoint
CREATE INDEX "books_active_idx" ON "books" USING btree ("deleted","archived");--> statement-breakpoint
CREATE INDEX "cart_user_idx" ON "cart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cart_book_idx" ON "cart" USING btree ("book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_user_book_idx" ON "cart" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "pending_changes_status_idx" ON "pending_changes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pending_changes_slug_idx" ON "pending_changes" USING btree ("book_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expiry_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "purchases_user_idx" ON "user_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "purchases_book_idx" ON "user_purchases" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "purchases_slug_idx" ON "user_purchases" USING btree ("book_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_user_book_idx" ON "user_purchases" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "purchases_release_idx" ON "user_purchases" USING btree ("released","release_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expiry_idx" ON "verification" USING btree ("expires_at");