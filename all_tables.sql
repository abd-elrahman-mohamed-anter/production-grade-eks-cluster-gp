-- Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  google_id TEXT UNIQUE,
  email TEXT,
  avatar TEXT,
  api_key TEXT
);

-- Scans
CREATE TABLE IF NOT EXISTS scans (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  target_url TEXT NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'quick',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_vulnerabilities INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0
);

-- Vulnerabilities
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id VARCHAR(36) PRIMARY KEY,
  scan_id VARCHAR(36) NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_url TEXT NOT NULL,
  remediation TEXT,
  details JSONB
);

-- Scheduled Scans
CREATE TABLE IF NOT EXISTS scheduled_scans (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  target_url TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time TEXT NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  month INTEGER,
  enabled BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  scan_depth TEXT DEFAULT 'medium',
  auto_scan BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  scan_id VARCHAR(36),
  report_name TEXT NOT NULL,
  report_path TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  total INTEGER DEFAULT 0,
  critical INTEGER DEFAULT 0,
  high INTEGER DEFAULT 0,
  medium INTEGER DEFAULT 0,
  low INTEGER DEFAULT 0,
  scan_type TEXT
);
