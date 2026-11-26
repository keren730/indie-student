import { sql } from 'drizzle-orm';
import { pgTable, pgEnum, uuid, text, integer, timestamp, index, primaryKey, check, type AnyPgColumn } from 'drizzle-orm/pg-core';

// Example (written for you): one row per family. Every other table hangs off this.
export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userRole = pgEnum('user_role', ['parent', 'child']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    role: userRole('role').notNull(),
    displayName: text('display_name').notNull(),
    email: text('email').unique(),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('users_family_id_idx').on(table.familyId)],
);

// A login session. `id` is the SHA-256 hash of the random token kept in the browser cookie,
// so a leaked database dump does not contain usable session tokens.
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

// A school subject. Math today; English or Grammar later are just more rows.
export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  nameHe: text('name_he').notNull(),
});

// A node in a subject's curriculum tree (for example Fractions > Comparing fractions).
export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    grade: integer('grade').notNull(),
    // Self-reference: the parent topic in the tree. Null for top-level topics.
    parentId: uuid('parent_id').references((): AnyPgColumn => topics.id, { onDelete: 'set null' }),
    // Stable English key used by seed data and material mapping, never shown to kids.
    slug: text('slug').notNull().unique(),
    nameHe: text('name_he').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('topics_subject_id_idx').on(table.subjectId), index('topics_parent_id_idx').on(table.parentId)],
);

// "To learn topicId, first learn prerequisiteId." A many-to-many link from topics to topics.
export const topicPrerequisites = pgTable(
  'topic_prerequisites',
  {
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    prerequisiteId: uuid('prerequisite_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.topicId, table.prerequisiteId] }),
    check('no_self_prerequisite', sql`${table.topicId} <> ${table.prerequisiteId}`),
    // The composite key only speeds up lookups starting with topicId; this covers the reverse.
    index('topic_prereq_prerequisite_idx').on(table.prerequisiteId),
  ],
);
