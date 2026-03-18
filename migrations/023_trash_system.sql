-- Trash system: add 'trash' type, trashed_at timestamps, and original location fields

-- Add 'trash' to system_root_type enum
ALTER TYPE system_root_type ADD VALUE IF NOT EXISTS 'trash';

-- Add trash fields to document_folders
ALTER TABLE document_folders
  ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_parent_folder_id UUID REFERENCES document_folders(id) DEFAULT NULL;

-- Add trash fields to documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_folder_id UUID REFERENCES document_folders(id) DEFAULT NULL;

-- Indexes for efficient purge queries
CREATE INDEX IF NOT EXISTS idx_document_folders_trashed_at
  ON document_folders (household_id, trashed_at)
  WHERE trashed_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_trashed_at
  ON documents (household_id, trashed_at)
  WHERE trashed_at IS NOT NULL AND deleted_at IS NULL;
