-- Ajouter statuts annuler et refuser + permettre suppression
ALTER TABLE white_label_requests DROP CONSTRAINT IF EXISTS white_label_requests_status_check;
ALTER TABLE white_label_requests ADD CONSTRAINT white_label_requests_status_check
  CHECK (status IN ('pending', 'processed', 'archived', 'cancelled', 'rejected'));
