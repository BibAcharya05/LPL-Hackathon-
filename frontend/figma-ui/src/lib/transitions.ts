export type Status = "Ready" | "Missing Info" | "Flagged" | "Submitted"
export type Source = {
  document: string
  page?: number | null
  label?: string
  value?: string
}
export type Issue = {
  code: string
  severity: string
  message: string
  action: string
  sources: Source[]
  expected_document?: string
}
export type Account = {
  normalized_fields?: Record<string, Source[]>

  packet_version?: string
  review_status?: "pending" | "approved" | "corrections_requested"
  review_revision?: number
  reviewer_name?: string
  review_notes?: string
  reviewed_at?: string
  reviewed_packet_version?: string

  account_id: string
  client_name: string | null
  account_type: string | null
  status: Status
  summary: string
  summary_source?: string
  processing_status: string
  checks_completed?: string[]
  issues: Issue[]
  observations?: {
    code: string
    message: string
    sources: Source[]
  }[]
}

export const REQUIRED_DOCUMENTS = [
  ["01_existing_account_statement.pdf", "Account statement"],
  ["02_new_account_application.pdf", "Account application"],
  ["03_account_transfer_form.pdf", "Transfer form"],
  ["04_investor_profile.pdf", "Investor profile"],
  ["05_beneficiary_designation.pdf", "Beneficiary designation"],
  ["06_advisory_agreement.pdf", "Advisory agreement"],
] as const

export function documentLabel(filename: string) {
  return REQUIRED_DOCUMENTS.find(([name]) => name === filename)?.[1] ?? filename
}

export function initials(name: string | null) {
  return (name || "Unknown client")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
}
