import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar, json, real, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Custom pgvector column type
// ---------------------------------------------------------------------------

import { customType } from "drizzle-orm/pg-core";

export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const chunkTypeEnum = pgEnum("chunk_type", [
  "article",
  "recital",
  "amendment",
  "opinion",
  "plenary_debate",
  "committee_hearing",
  "parliamentary_question",
  "analysis",
  "summary",
]);

export const speakerRoleEnum = pgEnum("speaker_role", ["chair", "mep", "witness", "mixed", "unknown"]);

export const procedureTypeEnum = pgEnum("procedure_type", ["COD", "CNS", "APP", "NLE", "INI", "RSP", "BUD", "DEC"]);

export const procedureStatusEnum = pgEnum("procedure_status", ["ongoing", "adopted", "rejected", "withdrawn"]);

export const transcriptionStatusEnum = pgEnum("transcription_status", ["pending", "transcribed", "attributed", "ingested"]);

export const alertFrequencyEnum = pgEnum("alert_frequency", ["daily", "weekly", "monthly"]);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// MEPs (new - first-class table for EU)
// ---------------------------------------------------------------------------

export const meps = pgTable("meps", {
  id: serial("id").primaryKey(),
  epId: varchar("ep_id", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  politicalGroup: varchar("political_group", { length: 128 }).notNull(),
  photoUrl: text("photo_url"),
  email: varchar("email", { length: 320 }),
  committees: json("committees").$type<Array<{ abbreviation: string; name: string; role: string }>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Mep = typeof meps.$inferSelect;
export type InsertMep = typeof meps.$inferInsert;

// ---------------------------------------------------------------------------
// Committees (new - DB-backed for EU, was config-only in UK)
// ---------------------------------------------------------------------------

export const committees = pgTable("committees", {
  id: serial("id").primaryKey(),
  abbreviation: varchar("abbreviation", { length: 16 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  chairMepId: varchar("chair_mep_id", { length: 64 }),
  colour: varchar("colour", { length: 32 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export type Committee = typeof committees.$inferSelect;
export type InsertCommittee = typeof committees.$inferInsert;

// ---------------------------------------------------------------------------
// Legislative Procedures (new - no UK equivalent)
// ---------------------------------------------------------------------------

export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  title: text("title").notNull(),
  type: procedureTypeEnum("type"),
  status: procedureStatusEnum("status").default("ongoing"),
  responsibleCommittee: varchar("responsible_committee", { length: 16 }),
  rapporteur: varchar("rapporteur", { length: 255 }),
  rapporteurMepId: varchar("rapporteur_mep_id", { length: 64 }),
  proposalDate: varchar("proposal_date", { length: 32 }),
  latestEventDate: varchar("latest_event_date", { length: 32 }),
  oeilUrl: text("oeil_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = typeof procedures.$inferInsert;

// ---------------------------------------------------------------------------
// Documents (adapted from UK reports table)
// ---------------------------------------------------------------------------

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 128 }).notNull().unique(),
  title: text("title").notNull(),
  committee: varchar("committee", { length: 255 }).notNull(),
  publicationDate: varchar("publication_date", { length: 32 }).notNull(),
  reference: varchar("reference", { length: 128 }).notNull(),
  url: text("url").notNull(),
  summary: text("summary"),
  documentType: varchar("document_type", { length: 64 }),
  procedureReference: varchar("procedure_reference", { length: 32 }),
  language: varchar("language", { length: 8 }).default("EN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ---------------------------------------------------------------------------
// Document Chunks with pgvector embeddings
// ---------------------------------------------------------------------------

export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  externalId: varchar("external_id", { length: 128 }).notNull().unique(),
  content: text("content").notNull(),
  sectionHeading: text("section_heading"),
  paragraphStart: integer("paragraph_start"),
  paragraphEnd: integer("paragraph_end"),
  chunkType: chunkTypeEnum("chunk_type").default("analysis"),
  speakerName: varchar("speaker_name", { length: 255 }),
  speakerRole: speakerRoleEnum("speaker_role"),
  speakers: json("speakers").$type<string[]>(),
  embedding: vector("embedding").notNull(),
  // Hearing-specific fields
  timestamp: integer("timestamp"),
  videoUrl: text("video_url"),
  attributionConfidence: real("attribution_confidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_chunks_document").on(table.documentId),
  index("idx_chunks_type").on(table.chunkType),
  index("idx_chunks_speaker").on(table.speakerName),
]);

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;

// ---------------------------------------------------------------------------
// Hearings (new - committee hearing metadata)
// ---------------------------------------------------------------------------

export const hearings = pgTable("hearings", {
  id: serial("id").primaryKey(),
  committeeAbbreviation: varchar("committee_abbreviation", { length: 16 }).notNull(),
  title: text("title").notNull(),
  date: varchar("date", { length: 32 }).notNull(),
  videoUrl: text("video_url"),
  duration: integer("duration"),
  transcriptionStatus: transcriptionStatusEnum("transcription_status").default("pending"),
  speakerCount: integer("speaker_count"),
  wordCount: integer("word_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Hearing = typeof hearings.$inferSelect;
export type InsertHearing = typeof hearings.$inferInsert;

// ---------------------------------------------------------------------------
// Plenary Debates (new - CRE debate metadata)
// ---------------------------------------------------------------------------

export const plenaryDebates = pgTable("plenary_debates", {
  id: serial("id").primaryKey(),
  sessionDate: varchar("session_date", { length: 32 }).notNull(),
  title: text("title").notNull(),
  debateType: varchar("debate_type", { length: 64 }),
  procedureReference: varchar("procedure_reference", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PlenaryDebate = typeof plenaryDebates.$inferSelect;
export type InsertPlenaryDebate = typeof plenaryDebates.$inferInsert;

// ---------------------------------------------------------------------------
// Voting Record (adapted from UK)
// ---------------------------------------------------------------------------

export const votingRecord = pgTable("voting_record", {
  id: serial("id").primaryKey(),
  mepId: varchar("mep_id", { length: 64 }).notNull(),
  mepName: varchar("mep_name", { length: 255 }).notNull(),
  committee: varchar("committee", { length: 255 }),
  politicalGroup: varchar("political_group", { length: 128 }),
  divisionId: varchar("division_id", { length: 64 }).notNull(),
  date: varchar("date", { length: 32 }).notNull(),
  title: text("title").notNull(),
  memberVotedFor: boolean("member_voted_for").notNull(),
  votedAgainstGroup: boolean("voted_against_group").default(false),
  totalFor: integer("total_for"),
  totalAgainst: integer("total_against"),
  totalAbstain: integer("total_abstain"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VotingRecord = typeof votingRecord.$inferSelect;
export type InsertVotingRecord = typeof votingRecord.$inferInsert;

// ---------------------------------------------------------------------------
// Written Questions (adapted from UK)
// ---------------------------------------------------------------------------

export const writtenQuestions = pgTable("written_questions", {
  id: serial("id").primaryKey(),
  mepId: varchar("mep_id", { length: 64 }).notNull(),
  mepName: varchar("mep_name", { length: 255 }).notNull(),
  committee: varchar("committee", { length: 255 }),
  questionId: varchar("question_id", { length: 64 }).notNull(),
  dateTabled: varchar("date_tabled", { length: 32 }).notNull(),
  heading: text("heading").notNull(),
  questionText: text("question_text"),
  answerText: text("answer_text"),
  answeringCommissioner: varchar("answering_commissioner", { length: 255 }),
  dateAnswered: varchar("date_answered", { length: 32 }),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WrittenQuestion = typeof writtenQuestions.$inferSelect;
export type InsertWrittenQuestion = typeof writtenQuestions.$inferInsert;

// ---------------------------------------------------------------------------
// Chat Sessions (reused from UK)
// ---------------------------------------------------------------------------

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  citations: json("citations").$type<Array<{ title: string; committee: string; url: string; reference: string }>>().notNull(),
  followUpQuestions: json("follow_up_questions").$type<string[]>().notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ---------------------------------------------------------------------------
// Alerts (reused from UK)
// ---------------------------------------------------------------------------

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  keywords: text("keywords").notNull(),
  committees: text("committees"),
  frequency: alertFrequencyEnum("frequency").default("weekly").notNull(),
  lastSent: timestamp("last_sent"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;
