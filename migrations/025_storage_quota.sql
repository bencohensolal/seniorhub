-- Add storage quota to households (default 5 GB)
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT NOT NULL DEFAULT 5368709120;
