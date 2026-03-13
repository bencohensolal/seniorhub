-- Migration: Persist display order for photo screens
-- Description: Adds display_order to photo_screens so custom photo galleries
-- can participate in tablet screen ordering and keep their position after reloads.

ALTER TABLE photo_screens
ADD COLUMN IF NOT EXISTS display_order INTEGER;

UPDATE photo_screens
SET display_order = ordered.position
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY tablet_id, household_id
    ORDER BY created_at ASC, id ASC
  ) - 1 AS position
  FROM photo_screens
) AS ordered
WHERE photo_screens.id = ordered.id
  AND photo_screens.display_order IS NULL;

ALTER TABLE photo_screens
ALTER COLUMN display_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_photo_screens_tablet_display_order
ON photo_screens(tablet_id, household_id, display_order);
