import { pgTable, text, timestamp, integer, jsonb, pgEnum, uuid, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const enquiryStatusEnum = pgEnum('enquiry_status', [
  'new',
  'contacted',
  'in_progress',
  'won',
  'closed',
  'spam'
]);

export const adminRoleEnum = pgEnum('admin_role', ['owner', 'admin', 'viewer']);

export const privacyRequestTypeEnum = pgEnum('privacy_request_type', [
  'access',
  'correction',
  'erasure',
  'withdraw_consent',
  'grievance',
  'nominate'
]);

export const privacyRequestStatusEnum = pgEnum('privacy_request_status', [
  'received',
  'verifying',
  'in_progress',
  'completed',
  'rejected'
]);

// Admin Users Table
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: adminRoleEnum('role').notNull().default('viewer'),
  password_hash: text('password_hash').notNull(),
  totp_secret_encrypted: text('totp_secret_encrypted'),
  totp_enrolled_at: timestamp('totp_enrolled_at', { withTimezone: true }),
  recovery_codes_hashed: text('recovery_codes_hashed').array(),
  failed_login_count: integer('failed_login_count').notNull().default(0),
  locked_until: timestamp('locked_until', { withTimezone: true }),
  last_login_at: timestamp('last_login_at', { withTimezone: true }),
  disabled_at: timestamp('disabled_at', { withTimezone: true }),
  password_changed_at: timestamp('password_changed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Enquiries Table
export const enquiries = pgTable('enquiries', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  company: text('company'),
  service: text('service'),
  message: text('message'),
  status: enquiryStatusEnum('status').notNull().default('new'),
  assigned_to: uuid('assigned_to').references(() => adminUsers.id),
  source_page: text('source_page').notNull().default('/'),
  consent_notice_version: text('consent_notice_version').notNull(),
  consent_given_at: timestamp('consent_given_at', { withTimezone: true }).notNull().defaultNow(),
  ip_hash: text('ip_hash').notNull(),
  user_agent_family: text('user_agent_family').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  closed_at: timestamp('closed_at', { withTimezone: true }),
  anonymised_at: timestamp('anonymised_at', { withTimezone: true })
}, (table) => ({
  statusCreatedIdx: index('enquiries_status_created_idx').on(table.status, table.created_at),
  createdAtIdx: index('enquiries_created_at_idx').on(table.created_at),
  assignedToIdx: index('enquiries_assigned_to_idx').on(table.assigned_to)
}));

// Enquiry Notes (Append-only)
export const enquiryNotes = pgTable('enquiry_notes', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  enquiry_id: uuid('enquiry_id').notNull().references(() => enquiries.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => adminUsers.id),
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Enquiry Events (Timeline)
export const enquiryEvents = pgTable('enquiry_events', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  enquiry_id: uuid('enquiry_id').notNull().references(() => enquiries.id, { onDelete: 'cascade' }),
  actor_id: uuid('actor_id').references(() => adminUsers.id),
  type: text('type').notNull(),
  from_value: text('from_value'),
  to_value: text('to_value'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Sessions
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // SHA-256 of the cookie token
  user_id: uuid('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  last_seen_at: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip_hash: text('ip_hash').notNull(),
  user_agent_family: text('user_agent_family').notNull(),
  mfa_verified_at: timestamp('mfa_verified_at', { withTimezone: true }),
  revoked_at: timestamp('revoked_at', { withTimezone: true })
});

// Audit Log (Append-only)
export const auditLog = pgTable('audit_log', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  actor_id: uuid('actor_id').references(() => adminUsers.id),
  action: text('action').notNull(),
  target_type: text('target_type'),
  target_id: text('target_id'),
  ip_hash: text('ip_hash'),
  metadata: jsonb('metadata')
});

// Rate Limits
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  window_start: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(1)
});

// Privacy Requests (DPDP Act Compliance Queue)
export const privacyRequests = pgTable('privacy_requests', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  received_at: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  channel: text('channel').notNull(), // 'email' | 'phone' | 'form'
  requester_name: text('requester_name').notNull(),
  requester_contact: text('requester_contact').notNull(),
  type: privacyRequestTypeEnum('type').notNull(),
  status: privacyRequestStatusEnum('status').notNull().default('received'),
  due_by: timestamp('due_by', { withTimezone: true }).notNull(),
  handled_by: uuid('handled_by').references(() => adminUsers.id),
  resolution_note: text('resolution_note'),
  completed_at: timestamp('completed_at', { withTimezone: true })
});

// System Settings
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  notification_inboxes: text('notification_inboxes').notNull(),
  retention_months: integer('retention_months').notNull().default(24),
  turnstile_enabled: text('turnstile_enabled').notNull().default('false'),
  privacy_contact_block: text('privacy_contact_block').notNull()
});
