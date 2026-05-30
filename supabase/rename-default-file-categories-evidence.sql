-- Optional: run only if public.claim_evidence exists (skip if you get "relation does not exist").
-- Renames stored evidence_type strings on old uploads.

UPDATE public.claim_evidence SET evidence_type = 'Site Photo' WHERE evidence_type = 'Damage Photo';

UPDATE public.claim_evidence SET evidence_type = 'Measurements' WHERE evidence_type = 'Moisture Reading';

UPDATE public.claim_evidence SET evidence_type = 'Correspondence' WHERE evidence_type = 'Insurance Email';

UPDATE public.claim_evidence SET evidence_type = 'Documents' WHERE evidence_type = 'Report';
