import { reviewAction } from "../lib/review-actions"
import type { Account } from "../lib/transitions"
import { accountValue, reviewPriority } from "../lib/assessment"
import Button from "./ui/button"
import StatusChip from "./status-chip"

type Props = { accounts: Account[]; onReview: (account: Account) => void }

export default function SpecialistQueue({ accounts, onReview }: Props) {
  const queue = [...accounts].sort((a, b) =>
    reviewPriority(b).rank - reviewPriority(a).rank ||
    (accountValue(b).cents ?? -1) - (accountValue(a).cents ?? -1) ||
    a.account_id.localeCompare(b.account_id)
  )

  return (
    <section className="specialist-queue">
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1} id="specialist-title">LPL Specialist Review</h1>
          <p>Resolve blockers, verify evidence, and record human decisions.</p>
        </div>
      </div>
      <details className="priority-policy">
        <summary>How review priority is assigned</summary>
        <p>
          High: transaction indicators or four or more findings. Medium: other
          unresolved findings. Routine: ready for human review. Verified account
          value breaks ties within a priority. This is a demo review policy,
          not a fraud probability or an official LPL risk score.
        </p>
      </details>
      {!queue.length && <p>No processed accounts available. Upload a packet to begin.</p>}
      <div className="specialist-list">
        {queue.map(account => {
          const priority = reviewPriority(account)
          const tasks = [...new Set(account.issues.map(reviewAction))]
          return (
            <article className="specialist-card" key={account.account_id}>
              <div className="specialist-card-heading">
                <div>
                  <span className={`priority-badge priority-${priority.label.toLowerCase()}`}>{priority.label} priority</span>
                  <h2>{account.client_name || account.account_id}</h2>
                  <p>{account.account_id} · {account.account_type}</p>
                </div>
                <div className="specialist-card-value">
                  <strong>{accountValue(account).label}</strong>
                  <StatusChip status={account.status} />
                </div>
              </div>
              <p className="priority-reason">{priority.reason}</p>
              <ol className="specialist-tasks">
                {(tasks.length ? tasks : [
                  account.review_status === "approved"
                    ? "Review completed for this packet version."
                    : "Review source documents and record a decision.",
                ]).map(task => <li key={task}>{task}</li>)}
              </ol>
              <div className="specialist-card-footer">
                <span>{account.issues.length} findings · {
                  account.review_status === "approved" ? "Approved" :
                  account.review_status === "corrections_requested" ? "Corrections requested" : "Pending review"
                }</span>
                <Button variant="outline" onClick={() => onReview(account)}>Open account</Button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
