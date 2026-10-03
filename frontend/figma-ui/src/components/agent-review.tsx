import { useEffect, useRef, useState } from "react"
import type { Account } from "../lib/transitions"
import Button from "./ui/button"

type Event = { service: string; status: string; message: string; time: string }
type Job = {
  status: string
  events: Event[]
  answer?: string
  error?: string
}

type SavedReview = {
  job_id: string
  packet_version: string
  saved_at: string
  answer: string
  model_id: string
  events: Event[]
}

export default function AgentReview({ account }: { account: Account }) {
  const [job, setJob] = useState<Job | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<SavedReview[]>([])
  const [historyError, setHistoryError] = useState("")

  const mounted = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const api = new URL("./api/", window.location.href).pathname

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function loadHistory() {
    try {
      const response = await fetch(
        `${api}accounts/${encodeURIComponent(account.account_id)}/agent-review-history`,
        { cache: "no-store" },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.error || "Could not load saved reviews.")
      if (!mounted.current) return
      if (result.packet_version !== account.packet_version) {
        setHistory([])
        setHistoryError("Packet changed. Refresh this account.")
        return
      }
      setHistory(result.reviews || [])
      setHistoryError("")
    } catch (problem) {
      if (mounted.current)
        setHistoryError(problem instanceof Error
          ? problem.message : "Could not load saved reviews.")
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [account.account_id, account.packet_version])

  async function poll(id: string) {
    try {
      const response = await fetch(`${api}agent-reviews/${id}`, { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not load activity.")
      if (!mounted.current) return
      setJob(result)
      if (result.status === "processing")
        timer.current = setTimeout(() => void poll(id), 1500)
      else {
        setBusy(false)
        if (result.status === "complete") void loadHistory()
        if (result.status === "failed") setError(result.error || "AI review failed.")
      }
    } catch (problem) {
      if (!mounted.current) return
      setBusy(false)
      setError(problem instanceof Error ? problem.message : "Could not load activity.")
    }
  }

  async function start() {
    setBusy(true)
    setError("")
    setJob(null)
    try {
      const response = await fetch(
        `${api}accounts/${encodeURIComponent(account.account_id)}/agent-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packet_version: account.packet_version }),
        },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not start AI review.")
      if (mounted.current) await poll(result.job_id)
    } catch (problem) {
      if (!mounted.current) return
      setBusy(false)
      setError(problem instanceof Error ? problem.message : "Could not start AI review.")
    }
  }

  return (
    <section className="agent-panel" aria-labelledby="agent-title">
      <div className="agent-heading">
        <div>
          <span className="eyebrow">BEDROCK · NOVA MICRO</span>
          <h2 id="agent-title">AI review assistant</h2>
          <p>Retrieve evidence and explain the current findings.</p>
        </div>
        <Button disabled={busy || !account.packet_version} onClick={() => void start()}>
          {busy ? "Reviewing…" : "Run AI review"}
        </Button>
      </div>

      {job && (
        <details className="agent-activity" open={busy}>
          <summary>{busy ? "Live tool activity" : "View tool activity"}</summary>
          <ol>
            {job.events.map((event, index) => (
              <li key={index}>
                <span className={`activity-dot activity-${event.status}`} />
                <div><strong>{event.service}</strong><p>{event.message}</p></div>
                <span>{event.status === "complete" ? "Done" : "Started"}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {job?.answer && <p className="agent-answer">{job.answer}</p>}
      {error && <p role="alert" className="review-feedback review-feedback-error">{error}</p>}
      {historyError && (
        <p role="alert" className="review-feedback review-feedback-error">
          {historyError}
        </p>
      )}
      {!!history.length && (
        <details className="agent-activity">
          <summary>Saved AI reviews ({history.length})</summary>
          {[...history].reverse().map(review => (
            <article key={review.job_id}>
              <p style={{ marginTop: 16 }}>
                <strong>{new Date(review.saved_at).toLocaleString()}</strong>
                {" · "}{review.model_id}
              </p>
              <p className="agent-answer">{review.answer}</p>
            </article>
          ))}
          <p style={{ marginTop: 16 }}>
            Latest 10 reviews for the current packet version.
          </p>
        </details>
      )}
      <small>AI explanations support review. Account status and human decisions remain unchanged.</small>
    </section>
  )
}
