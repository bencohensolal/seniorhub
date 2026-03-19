CREATE TABLE IF NOT EXISTS medication_logs (
  id TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(5),
  taken_at TIMESTAMPTZ NOT NULL,
  taken_by_user_id TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medication_logs_med_date
  ON medication_logs(medication_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_medication_logs_household_date
  ON medication_logs(household_id, scheduled_date);
