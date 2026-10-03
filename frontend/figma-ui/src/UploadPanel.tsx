import { useEffect, useRef, useState } from "react"
import {
  FileText,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react"
import Button from "./components/ui/button"
import DialogContent, {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "./components/ui/dialog"
import { REQUIRED_DOCUMENTS } from "./lib/transitions"

type Props = {
  initialPacketId?: string
  onClose: () => void

  onComplete: () => void
  onRestoreFocus: () => void
}

const API = new URL("./api", window.location.href).pathname

export default function UploadPanel({
  initialPacketId = "T003",
  onClose,
  onComplete,
  onRestoreFocus,
}: Props) {
  const [packetId, setPacketId] = useState(initialPacketId)
  const previousFocus = useRef(document.activeElement as HTMLElement | null)

  const [files, setFiles] = useState<File[]>([])

  const [synthetic, setSynthetic] = useState(false)

  const [busy, setBusy] = useState(false)

  const [stage, setStage] = useState("")

  const [error, setError] = useState("")
  const [retryJob, setRetryJob] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mounted = useRef(true)
  const locked = busy || !!retryJob

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false

      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function poll(jobId: string) {
    try {
      const response = await fetch(
        `${API}/uploads/${jobId}`,

        { cache: "no-store" },
      )

      const job = await response.json()

      if (!response.ok) throw new Error(job.error || "Status check failed.")

      if (!mounted.current) return

      setStage(job.stage)

      if (job.status === "complete") {
        setBusy(false)

        onComplete()

        return
      }

      if (job.status === "failed") {
        setRetryJob(null)
        setBusy(false)
        setError(job.error || "Processing failed. Please retry your upload.")
        return
      }

      timer.current = setTimeout(() => void poll(jobId), 2500)
    } catch (problem) {
      if (!mounted.current) return

      setBusy(false)
      setRetryJob(jobId)
      setError(
        problem instanceof Error ? problem.message : "Status check failed.",
      )
    }
  }

  async function upload() {
    setBusy(true)

    setError("")
    setRetryJob(null)
    setStage("Sending documents…")

    try {
      const form = new FormData()

      form.append("packet_id", packetId)

      form.append("synthetic", String(synthetic))

      files.forEach((file) => form.append("files", file))

      const response = await fetch(`${API}/uploads`, {
        method: "POST",

        body: form,
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Upload failed.")

      if (typeof data.job_id !== "string")
        throw new Error(
          "The upload service did not return a job ID. Please try again.",
        )
      await poll(data.job_id)
    } catch (problem) {
      if (!mounted.current) return

      setBusy(false)

      setError(problem instanceof Error ? problem.message : "Upload failed.")
    }
  }

  const validationError =
    files.length > 7
      ? "Select up to seven PDF documents."
      : new Set(files.map((file) => file.name)).size !== files.length
        ? "Each document filename must be unique."
        : files.some((file) => !file.name.toLowerCase().endsWith(".pdf"))
          ? "Only PDF documents can be uploaded."
          : files.some((file) => file.size > 5 * 1024 * 1024)
            ? "Each PDF must be 5 MB or smaller."
            : files.some(
                  (file) =>
                    !REQUIRED_DOCUMENTS.some(([name]) => name === file.name) &&
                    file.name !== "07_transaction_activity_report.pdf",
                )
              ? "Use the original document filenames from the synthetic packet."
              : ""

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (previousFocus.current?.isConnected) previousFocus.current.focus()
          else onRestoreFocus()
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault()
        }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">DOCUMENT INTAKE</p>
            <DialogTitle>Upload transition packet</DialogTitle>
            <DialogDescription className="modal-description">
              Add synthetic PDFs to check account readiness.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close upload dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        <div className="modal-body">
          <label className="field-label">
            Demo packet
            <select
              className="select-control"
              value={packetId}
              disabled={locked}
              onChange={(event) => {
                setPacketId(event.target.value)
                setFiles([])
                setSynthetic(false)
                setError("")
                setStage("")
              }}
            >
              <option value="T001">T001 — Jordan Kim</option>
              <option value="T002">T002 — Priya Shah</option>
              <option value="T003">T003 — Marcus Lee</option>
              <option value="T004">T004 — Elena Rodriguez</option>
              <option value="T005">T005 — Cameron Blake</option>
            </select>
          </label>

          <div className="drop-zone">
            <Upload size={26} aria-hidden="true" />
            <label htmlFor="packet-files">
              Select this packet’s PDF documents
            </label>
            <p id="file-guidance">
              Original filenames · Up to 7 PDFs · 5 MB per file
            </p>
            <input
              key={packetId}
              id="packet-files"
              aria-describedby="file-guidance"
              aria-invalid={!!validationError}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              disabled={locked}
              onChange={(event) => {
                setFiles(Array.from(event.target.files || []))
                setError("")
                setStage("")
              }}
            />
          </div>

          {!!files.length && (
            <ul className="file-list" aria-label="Selected documents">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <FileText size={18} aria-hidden="true" />
                  <div>
                    <strong>{file.name}</strong>
                    <span>{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={locked}
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setFiles(files.filter((item) => item !== file))
                    }
                  >
                    <X size={15} />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={synthetic}
              disabled={locked}
              onChange={(event) => setSynthetic(event.target.checked)}
            />{" "}
            These are fictional hackathon documents.
          </label>

          {busy && (
            <div className="upload-progress" role="status">
              <LoaderCircle size={18} className="spin" />
              <span>
                {stage || "Checking processing status…"} Keep this dialog open.
              </span>
            </div>
          )}
          {(error || validationError) && (
            <div className="upload-error" role="alert">
              <TriangleAlert size={17} />
              <span>{validationError || error}</span>
            </div>
          )}
          {retryJob && !busy && (
            <Button
              variant="outline"
              onClick={() => {
                setBusy(true)
                setError("")
                void poll(retryJob)
              }}
            >
              Retry status check
            </Button>
          )}

          <p className="upload-note">
            Each upload replaces this account’s checked results after successful
            processing. Upload the whole available packet together.
          </p>
        </div>

        <div className="modal-footer">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              busy ||
              !synthetic ||
              !files.length ||
              !!validationError ||
              !!retryJob
            }
            onClick={() => void upload()}
          >
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            {busy ? "Processing…" : "Upload and analyze"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
