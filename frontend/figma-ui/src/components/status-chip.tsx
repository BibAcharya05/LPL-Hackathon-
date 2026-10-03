import { CircleCheck, CircleAlert, TriangleAlert, Send } from "lucide-react"

export default function StatusChip({ status }: { status: string }) {
  const Icon =
    status === "Ready"
      ? CircleCheck
      : status === "Missing Info"
        ? CircleAlert
        : status === "Submitted"
          ? Send
          : TriangleAlert
  return (
    <span
      className={`status-chip status-${status.toLowerCase().replace(/ /g, "-")}`}
    >
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
  )
}
