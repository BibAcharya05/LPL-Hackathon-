import type { Account } from "../lib/transitions"
import { accountValue, money } from "../lib/assessment"

export default function BookOverview({ accounts }: { accounts: Account[] }) {
  const values = accounts.map(account => ({ account, value: accountValue(account) }))
  const verified = values.filter(row => row.value.cents !== null)
  const total = verified.reduce((sum, row) => sum + row.value.cents!, 0)
  const attention = verified
    .filter(row => row.account.issues.length > 0)
    .reduce((sum, row) => sum + row.value.cents!, 0)
  const excluded = accounts.length - verified.length
  const pending = accounts.filter(account => account.review_status !== "approved").length

  return (
    <section className="book-overview" aria-label="Book assessment">
      <div className="book-overview-heading">
        <span>TRANSITION BOOK</span>
        <h2>A clear view of your next move</h2>
        <p>{accounts.length} accounts · {excluded} with unavailable or unverified values</p>
      </div>
      <div className="book-metrics">
        <div><span>Verified account value</span><strong>{verified.length ? money(total) : "Unavailable"}</strong></div>
        <div><span>Verified value needing attention</span><strong>{verified.length ? money(attention) : "Unavailable"}</strong></div>
        <div><span>Awaiting review or corrections</span><strong>{pending}</strong></div>
      </div>
      <small>Totals exclude missing or conflicting amounts. Values reflect uploaded documents.</small>
    </section>
  )
}
