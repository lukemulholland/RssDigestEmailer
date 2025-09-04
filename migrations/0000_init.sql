-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- feeds
CREATE TABLE IF NOT EXISTS feeds (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  check_frequency_hours INTEGER NOT NULL DEFAULT 4,
  include_in_summary BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked TIMESTAMP NULL,
  last_error TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- summaries
CREATE TABLE IF NOT EXISTS summaries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_error TEXT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  feed_ids TEXT[] NOT NULL DEFAULT '{}'
);

-- email_settings
CREATE TABLE IF NOT EXISTS email_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_server TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_security TEXT NOT NULL DEFAULT 'TLS',
  from_email TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  subject_template TEXT NOT NULL DEFAULT 'RSS Summary - {date}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- schedule_settings
CREATE TABLE IF NOT EXISTS schedule_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  frequency_hours INTEGER NOT NULL DEFAULT 4,
  next_run TIMESTAMP NULL,
  last_run TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB NULL,
  level TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
