import type { Account } from "./transitions"
import { accountValue, reviewPriority } from "./assessment"
import { reviewAction } from "./review-actions"

export function downloadMigrationPlan(accounts: Account[]) {
  const queue = [...accounts].sort((a, b) =>
    reviewPriority(b).rank - reviewPriority(a).rank ||
    (accountValue(b).cents ?? -1) - (accountValue(a).cents ?? -1) ||
    a.account_id.localeCompare(b.account_id)
  )

  const generated = new Date().toISOString()
  const rows: string[][] = [[
    "Plan order", "Account ID", "Client", "Account type",
    "Account value", "Review priority", "Priority reason",
    "Account status", "Human review", "Finding count",
    "Key findings", "Next actions", "Packet version", "Generated at",
  ]]

  queue.forEach((account, index) => {
    const priority = reviewPriority(account)
    const approved =
      account.review_status === "approved" &&
      account.reviewed_packet_version === account.packet_version

    const actions = [...new Set(account.issues.map(reviewAction))]
    rows.push([
      String(index + 1),
      account.account_id,
      account.client_name || "Unknown client",
      account.account_type || "Unavailable",
      accountValue(account).label,
      priority.label,
      priority.reason,
      account.status,
      account.review_status || "pending",
      String(account.issues.length),
      account.issues.map(issue => issue.message).join(" | "),
      actions.length
        ? actions.join(" | ")
        : approved
          ? "Human review recorded for this packet version."
          : "Review source documents and record a human decision.",
      account.packet_version || "Unavailable",
      generated,
    ])
  })

  // Quote every cell and prevent spreadsheet formula execution.
  const cell = (value: string) => {
    const safe = /^[\s]*[=+\-@]/.test(value) ? "'" + value : value
    return `"${safe.replace(/"/g, '""')}"`
  }
  const csv = "\uFEFF" +
    rows.map(row => row.map(cell).join(",")).join("\r\n")

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `team16-migration-plan-${generated.slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
