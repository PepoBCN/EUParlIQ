CREATE TYPE "public"."alert_frequency" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."chunk_type" AS ENUM('article', 'recital', 'amendment', 'opinion', 'plenary_debate', 'committee_hearing', 'parliamentary_question', 'analysis', 'summary');--> statement-breakpoint
CREATE TYPE "public"."procedure_status" AS ENUM('ongoing', 'adopted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."procedure_type" AS ENUM('COD', 'CNS', 'APP', 'NLE', 'INI', 'RSP', 'BUD', 'DEC');--> statement-breakpoint
CREATE TYPE "public"."speaker_role" AS ENUM('chair', 'mep', 'witness', 'mixed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."transcription_status" AS ENUM('pending', 'transcribed', 'attributed', 'ingested');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"keywords" text NOT NULL,
	"committees" text,
	"frequency" "alert_frequency" DEFAULT 'weekly' NOT NULL,
	"last_sent" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"citations" json NOT NULL,
	"follow_up_questions" json NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committees" (
	"id" serial PRIMARY KEY NOT NULL,
	"abbreviation" varchar(16) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"short_name" varchar(64) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"chair_mep_id" varchar(64),
	"colour" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "committees_abbreviation_unique" UNIQUE("abbreviation"),
	CONSTRAINT "committees_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"content" text NOT NULL,
	"section_heading" text,
	"paragraph_start" integer,
	"paragraph_end" integer,
	"chunk_type" "chunk_type" DEFAULT 'analysis',
	"speaker_name" varchar(255),
	"speaker_role" "speaker_role",
	"speakers" json,
	"embedding" vector(1536) NOT NULL,
	"timestamp" integer,
	"video_url" text,
	"attribution_confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_chunks_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"title" text NOT NULL,
	"committee" varchar(255) NOT NULL,
	"publication_date" varchar(32) NOT NULL,
	"reference" varchar(128) NOT NULL,
	"url" text NOT NULL,
	"summary" text,
	"document_type" varchar(64),
	"procedure_reference" varchar(32),
	"language" varchar(8) DEFAULT 'EN',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "hearings" (
	"id" serial PRIMARY KEY NOT NULL,
	"committee_abbreviation" varchar(16) NOT NULL,
	"title" text NOT NULL,
	"date" varchar(32) NOT NULL,
	"video_url" text,
	"duration" integer,
	"transcription_status" "transcription_status" DEFAULT 'pending',
	"speaker_count" integer,
	"word_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meps" (
	"id" serial PRIMARY KEY NOT NULL,
	"ep_id" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(64) NOT NULL,
	"political_group" varchar(128) NOT NULL,
	"photo_url" text,
	"email" varchar(320),
	"committees" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meps_ep_id_unique" UNIQUE("ep_id")
);
--> statement-breakpoint
CREATE TABLE "plenary_debates" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_date" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"debate_type" varchar(64),
	"procedure_reference" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"type" "procedure_type",
	"status" "procedure_status" DEFAULT 'ongoing',
	"responsible_committee" varchar(16),
	"rapporteur" varchar(255),
	"rapporteur_mep_id" varchar(64),
	"proposal_date" varchar(32),
	"latest_event_date" varchar(32),
	"oeil_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "procedures_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE TABLE "voting_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"mep_id" varchar(64) NOT NULL,
	"mep_name" varchar(255) NOT NULL,
	"committee" varchar(255),
	"political_group" varchar(128),
	"division_id" varchar(64) NOT NULL,
	"date" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"member_voted_for" boolean NOT NULL,
	"voted_against_group" boolean DEFAULT false,
	"total_for" integer,
	"total_against" integer,
	"total_abstain" integer,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "written_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"mep_id" varchar(64) NOT NULL,
	"mep_name" varchar(255) NOT NULL,
	"committee" varchar(255),
	"question_id" varchar(64) NOT NULL,
	"date_tabled" varchar(32) NOT NULL,
	"heading" text NOT NULL,
	"question_text" text,
	"answer_text" text,
	"answering_commissioner" varchar(255),
	"date_answered" varchar(32),
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_chunks_document" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_type" ON "document_chunks" USING btree ("chunk_type");--> statement-breakpoint
CREATE INDEX "idx_chunks_speaker" ON "document_chunks" USING btree ("speaker_name");