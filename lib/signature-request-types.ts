export type SignatureRequestStatus =
  | 'pending'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'voided'

export type SignatureRequestRow = {
  id: string
  organization_id: string
  project_id: string
  project_client_access_id: string
  client_email: string
  source_file_path: string
  source_file_name: string
  claim_id: string | null
  signwell_document_id: string | null
  embedded_signing_url: string | null
  status: SignatureRequestStatus
  signed_file_path: string | null
  typed_signer_name: string | null
  requested_by_user_id: string
  requested_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}
