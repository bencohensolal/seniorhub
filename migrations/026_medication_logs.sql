CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(5),
  taken_at TIMESTAMPTZ NOT NULL,
  taken_by_user_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medication_logs_med_date
  ON medication_logs(medication_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_medication_logs_household_date
  ON medication_logs(household_id, scheduled_date);
