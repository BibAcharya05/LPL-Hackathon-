import type { Account, Source } from "./transitions"

export function accountValue(account: Account) {
  const sources = account.normalized_fields?.transfer_value ?? []
  const amounts = sources.map((source: Source) => {
    const text = (source.value ?? "").trim()
    if (!/^\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) return null
    const cents = Math.round(Number(text.replace(/[$,]/g, "")) * 100)
    return Number.isSafeInteger(cents) ? cents : null
  })
  const valid = amounts.filter((value): value is number => value !== null)
  const unique = [...new Set(valid)]

  if (!sources.length || !valid.length)
    return { cents: null, label: "Unavailable" }

  if (valid.length !== sources.length || unique.length !== 1)
    return { cents: null, label: "Needs verification" }

  return { cents: unique[0], label: money(unique[0]) }
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function reviewPriority(account: Account) {
  if (account.issues.some((issue) =>
    ["TRANSACTION_DESTINATION_REVIEW", "RETURNED_PAYMENT_REVIEW"].includes(issue.code)
  )) return { rank: 3, label: "High", reason: "Transaction indicators require specialist review." }

  if (account.issues.length >= 4)
    return { rank: 3, label: "High", reason: "Four or more unresolved findings." }

  if (account.issues.length)
    return { rank: 2, label: "Medium", reason: "Resolve missing information or inconsistent fields." }

  return {
    rank: account.review_status === "approved" ? 0 : 1,
    label: account.review_status === "approved" ? "Complete" : "Routine",
    reason: account.review_status === "approved"
      ? "Human review recorded."
      : "Ready for human review.",
  }
}
