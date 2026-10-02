import { useEffect, useRef, useState } from "react";

type Props = {
  onClose: () => void;
  onComplete: () => void;
};

const API = new URL("./api", window.location.href).pathname;

export default function UploadPanel({ onClose, onComplete }: Props) {
  const [packetId, setPacketId] = useState("T003");
  const [files, setFiles] = useState<File[]>([]);
  const [synthetic, setSynthetic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function poll(jobId: string) {
    try {
      const response = await fetch(
        `${API}/uploads/${jobId}`,
        { cache: "no-store" },
      );
      const job = await response.json();

      if (!response.ok) throw new Error(job.error || "Status check failed.");
      if (!mounted.current) return;

      setStage(job.stage);

      if (job.status === "complete") {
        setBusy(false);
        onComplete();
        return;
      }

      if (job.status === "failed") {
        throw new Error(job.error || "Processing failed.");
      }

      timer.current = setTimeout(() => void poll(jobId), 2500);
    } catch (problem) {
      if (!mounted.current) return;
      setBusy(false);
      setError(
        problem instanceof Error ? problem.message : "Status check failed.",
      );
    }
  }

  async function upload() {
    setBusy(true);
    setError("");
    setStage("Sending documents…");

    try {
      const form = new FormData();
      form.append("packet_id", packetId);
      form.append("synthetic", String(synthetic));
      files.forEach((file) => form.append("files", file));

      const response = await fetch(`${API}/uploads`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Upload failed.");

      await poll(data.job_id);
    } catch (problem) {
      if (!mounted.current) return;
      setBusy(false);
      setError(
        problem instanceof Error ? problem.message : "Upload failed.",
      );
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        className="upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Synthetic documents only</p>
            <h2 id="upload-title">Upload transition packet</h2>
          </div>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="modal-body">
          <label className="field-label">
            Demo packet
            <select
              className="select-control"
              value={packetId}
              disabled={busy}
              onChange={(event) => setPacketId(event.target.value)}
            >
              <option value="T001">T001 — Jordan Kim</option>
              <option value="T002">T002 — Priya Shah</option>
              <option value="T003">T003 — Marcus Lee</option>
            </select>
          </label>

          <div className="drop-zone">
            <label>
              <strong>Select this packet’s PDF documents</strong>
              <p>Use the original filenames. Up to 6 PDFs, 5 MB each.</p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                disabled={busy}
                onChange={(event) =>
                  setFiles(Array.from(event.target.files || []))
                }
              />
            </label>
          </div>

          <ul>
            {files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>

          <label>
            <input
              type="checkbox"
              checked={synthetic}
              disabled={busy}
              onChange={(event) => setSynthetic(event.target.checked)}
            />
            {" "}These are fictional hackathon documents.
          </label>

          <p role="status">{stage}</p>
          {error && <p role="alert" style={{ color: "#a52a2a" }}>{error}</p>}

          <p>
            Each upload replaces this account’s checked results after successful
            processing. Upload the whole available packet together.
          </p>
        </div>

        <div className="modal-footer">
          <button
            className="primary-button"
            disabled={busy || !synthetic || !files.length}
            onClick={() => void upload()}
          >
            {busy ? "Processing…" : "Upload and analyze"}
          </button>
        </div>
      </section>
    </div>
  );
}