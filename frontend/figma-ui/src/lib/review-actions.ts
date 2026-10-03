import { documentLabel, type Issue } from "./transitions"

export function reviewAction(issue: Issue): string {
  const evidence = [...new Set(
    issue.sources.map(source =>
      `${documentLabel(source.document)}${source.page ? `, page ${source.page}` : ""}`
    )
  )].join("; ")

  if (issue.code === "MISSING_DOCUMENT" && issue.expected_document) {
    return `Obtain the ${documentLabel(issue.expected_document).toLowerCase()} and upload the complete corrected packet for rechecking.`
  }

  if (issue.code === "TRANSACTION_DESTINATION_REVIEW") {
    return "Verify the third-party recipients and newly added destinations against the activity report and supporting records. Document the explanation or request supporting documents before approval."
  }

  if (issue.code === "RETURNED_PAYMENT_REVIEW") {
    return "Investigate the returned payment and destination account-name mismatch. Confirm the intended recipient and request supporting records before approval."
  }

  if (issue.code === "FIELD_DIFFERENCE") {
    const field =
      issue.message.match(/different values found for (.+?)[.!]?$/i)?.[1] ||
      issue.sources.find(source => source.label)?.label ||
      "reported field"

    return `Reconcile the conflicting ${field.toLowerCase()} values${evidence ? ` in ${evidence}` : ""}. Confirm the intended value with the client, document the explanation, and request corrections if needed.`
  }

  if (issue.code === "FIELD_REVIEW") {
    return `Verify the unreadable or incomplete field against ${evidence || "the source documents"}. Obtain clarification or a legible replacement, then upload the complete corrected packet.`
  }

  return issue.action
}
