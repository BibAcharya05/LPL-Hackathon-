import { useState } from "react"
import type { Account } from "../lib/transitions"
import Button from "./ui/button"

type Props = {
  account: Account
  onSaved: () => Promise<void>
}

export default function HumanReview({ account, onSaved }: Props) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const ready = account.status === "Ready" && account.issues.length === 0
  const labels = {
    pending: "Pending review",
    approved: "Approved",
    corrections_requested: "Corrections requested",
  }
  const reviewStatus = account.review_status || "pending"
  const canSubmit = Boolean(
    name.trim() && confirmed && account.packet_version && !busy,
  )
async function decide(decision: "approved" | "corrections_requested") {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const api = new URL("./api/accounts/", window.location.href)
      const response = await fetch(
        `${api.pathname}${encodeURIComponent(account.account_id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            reviewer_name: name.trim(),
            review_notes: notes.trim(),
            confirmed,
            packet_version: account.packet_version,
            review_revision: account.review_revision ?? 0,
          }),
        },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not save review.")
      setMessage(result.message)
      setConfirmed(false)
      await onSaved()
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save review.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="human-review-panel" aria-labelledby="human-review-title">
      <div className="human-review-heading">
        <div>
          <h2 id="human-review-title">Human review</h2>
          <p>Record your decision for this packet.</p>
        </div>
        <span className={`review-badge review-${reviewStatus}`}>
          {labels[reviewStatus]}
        </span>
      </div>

      {account.reviewed_at && (
        <div className="review-record">
          <strong>{account.reviewer_name}</strong>
          <span>{new Date(account.reviewed_at).toLocaleString()}</span>
          {account.review_notes && <p>{account.review_notes}</p>}
        </div>
      )}

      <div className="human-review-fields">
        <label className="review-field">
          <span>Demo reviewer name</span>
          <input
            placeholder="Enter your name"
            autoComplete="name"
            maxLength={100}
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="review-field">
          <span>Review notes</span>
          <textarea
            placeholder="Add decision context or requested corrections"
            rows={3}
            maxLength={2000}
            value={notes}
            disabled={busy}
            onChange={(event) => setNotes(event.target.value)}
          />
          <small>Required when requesting corrections.</small>
        </label>
      </div>

      <label className="review-confirmation">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>I reviewed the source documents and findings.</span>
      </label>

      {!ready && (
        <p className="review-notice">
          Resolve findings and recheck before approval.
        </p>
      )}
      {!account.packet_version && (
        <p className="review-notice">Refresh the account before reviewing.</p>
      )}

      {error && (
        <p role="alert" className="review-feedback review-feedback-error">{error}</p>
      )}
      {message && (
        <p role="status" className="review-feedback review-feedback-success">{message}</p>
      )}

      <div className="human-review-footer">
        <details className="review-scope">
          <summary>Demo review scope</summary>
          <p>
            Reviewer names are self-reported. Approval records a demo decision;
            it does not submit a transfer.
          </p>
        </details>
        <div className="human-review-actions">
          <Button
            variant="outline"
            disabled={!canSubmit || !notes.trim()}
            onClick={() => void decide("corrections_requested")}
          >
            Request corrections
          </Button>
          <Button
            disabled={!canSubmit || !ready}
            onClick={() => void decide("approved")}
          >
            {busy ? "Saving…" : "Approve packet"}
          </Button>
        </div>
      </div>
    </section>
  )
}
