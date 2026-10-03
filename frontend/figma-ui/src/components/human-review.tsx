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
  const controlStyle = {
    display: "block",
    width: "100%",
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    marginTop: "6px",
  }

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
    <section className="summary-panel" style={{ marginTop: 24 }} aria-labelledby="human-review-title">
      <h2 id="human-review-title">Human review</h2>
      <p><strong>{labels[reviewStatus]}</strong></p>

      {account.reviewed_at && (
        <div style={{ margin: "12px 0" }}>
          <p>Reviewed by {account.reviewer_name} · {new Date(account.reviewed_at).toLocaleString()}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{account.review_notes}</p>
        </div>
      )}

      <p>Demo reviewer names are self-reported; this is not authenticated sign-off.</p>

      <label style={{ display: "block", marginTop: 16 }}>
        Demo reviewer name
        <input
          style={controlStyle}
          maxLength={100}
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label style={{ display: "block", marginTop: 16 }}>
        Review notes — required when requesting corrections
        <textarea
          style={controlStyle}
          rows={3}
          maxLength={2000}
          value={notes}
          disabled={busy}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <label style={{ display: "block", margin: "16px 0" }}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(event) => setConfirmed(event.target.checked)}
        />{" "}
        I reviewed the source documents and findings.
      </label>

      {!ready && <p>Resolve findings and upload the corrected packet before approval.</p>}
      {!account.packet_version && <p>Refresh the account before reviewing.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        <Button disabled={!canSubmit || !ready} onClick={() => void decide("approved")}>
          {busy ? "Saving…" : "Approve packet"}
        </Button>
        <Button
          variant="outline"
          disabled={!canSubmit || !notes.trim()}
          onClick={() => void decide("corrections_requested")}
        >
          Request corrections
        </Button>
      </div>

      {error && <p role="alert" style={{ color: "#b91c1c", marginTop: 12 }}>{error}</p>}
      {message && <p role="status" style={{ marginTop: 12 }}>{message}</p>}
      <p style={{ marginTop: 16 }}>Approval records a demo review decision. No transfer is submitted.</p>
    </section>
  )
}
