-- Remove user-created folders at root level (non-system roots with no parent)
-- These should not exist as the UI and backend now block root-level creation
UPDATE document_folders
SET deleted_at = NOW()
WHERE parent_folder_id IS NULL
  AND type != 'system_root'
  AND deleted_at IS NULL;
