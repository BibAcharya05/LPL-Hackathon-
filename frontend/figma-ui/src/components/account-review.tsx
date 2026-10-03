import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CircleHelp,
  FileText,
  Info,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import Button from "./ui/button"
import StatusChip from "./status-chip"
import {
  documentLabel,
  initials,
  REQUIRED_DOCUMENTS,
  type Account,
} from "@/lib/transitions"

type Props = {
  account: Account
  onBack: () => void
  onUpload: () => void
}

export default function AccountReview({ account, onBack, onUpload }: Props) {
  const missing = new Set(
    account.issues
      .filter((issue) => issue.code === "MISSING_DOCUMENT")
      .map((issue) => issue.expected_document),
  )
  const checked =
    account.checks_completed?.includes("required_documents") ?? false
  const present = REQUIRED_DOCUMENTS.filter(
    ([filename]) => !missing.has(filename),
  ).length
  return (
    <>
      <Button variant="ghost" className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        All transitions
      </Button>
      <div className="review-heading">
        <div className="review-client">
          <span className="client-avatar large">
            {initials(account.client_name)}
          </span>
          <div>
            <div className="title-with-status">
              <h1 id="review-title" tabIndex={-1}>
                {account.client_name || "Unknown client"}
              </h1>
              <StatusChip status={account.status} />
            </div>
            <div className="metadata">
              <span>{account.account_type || "Account type unavailable"}</span>
              <span>{account.account_id}</span>
              <span>Processing: {account.processing_status}</span>
            </div>
          </div>
        </div>
        <span className="workspace-badge">
          <ShieldCheck size={14} />
          Human review required
        </span>
      </div>
      <div className="detail-layout">
        <div className="detail-primary">
          <section className="summary-panel">
            <div className="panel-heading">
              <span className="panel-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <h2>Transition summary</h2>
                <span>
                  {account.summary_source === "bedrock"
                    ? "AI-assisted summary"
                    : "Based on document checks"}
                </span>
              </div>
            </div>
            <p className="summary-copy">{account.summary}</p>
            <div className="summary-disclaimer">
              <Info size={14} />
              Verify against source documents before taking action.
            </div>
          </section>
          <section className="issues-section" aria-labelledby="findings-title">
            <div className="section-heading">
              <h2 id="findings-title">
                Items needing attention{" "}
                <span className="count-label">{account.issues.length}</span>
              </h2>
              <span>Source-backed findings</span>
            </div>
            <div className="issue-list">
              {account.issues.map((issue, index) => (
                <article className="issue-card" key={`${issue.code}-${index}`}>
                  <div className="finding-meta">
                    <span>Finding {String(index + 1).padStart(2, "0")}</span>
                    <StatusChip status={issue.severity} />
                  </div>
                  <h3>{issue.message}</h3>
                  {issue.sources.length > 0 && (
                    <div className="evidence-grid">
                      {issue.sources.map((source, sourceIndex) => (
                        <div className="evidence" key={sourceIndex}>
                          <span className="evidence-label">
                            {source.label || "Source evidence"}
                          </span>
                          <strong>
                            {source.value || "Inspect source document"}
                          </strong>
                          <span className="evidence-source">
                            <FileText size={14} />
                            {documentLabel(source.document)}
                            {source.page ? ` · Page ${source.page}` : ""}
                          </span>
                          <small>{source.document}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  {issue.expected_document && (
                    <div className="expected-document">
                      <FileText size={17} />
                      <div>
                        <span>Missing document</span>
                        <strong>
                          {documentLabel(issue.expected_document)}
                        </strong>
                        <small>{issue.expected_document}</small>
                      </div>
                    </div>
                  )}
                  <div className="finding-action">
                    <ArrowRight size={16} />
                    <div>
                      <strong>Recommended next step</strong>
                      <p>{issue.action}</p>
                    </div>
                  </div>
                </article>
              ))}
              {!account.issues.length && (
                <div className="clear-findings">
                  <CircleCheck size={28} />
                  <h3>No findings from the implemented checks</h3>
                  <p>
                    Review the source documents to confirm this account is ready
                    to proceed.
                  </p>
                </div>
              )}
            </div>
          </section>
          {!!account.observations?.length && (
            <section className="review-notes">
              <h2>
                <Info size={17} />
                Review notes
              </h2>
              {account.observations.map((note, index) => (
                <div key={index}>
                  <p>{note.message}</p>
                  <span>
                    {note.sources
                      .map(
                        (source) =>
                          `${documentLabel(source.document)}${
                            source.page ? ` · Page ${source.page}` : ""
                          }`,
                      )
                      .join("; ")}
                  </span>
                </div>
              ))}
            </section>
          )}
        </div>
        <aside className="detail-sidebar">
          <section className="checklist-card">
            <div className="checklist-heading">
              <span className="eyebrow">DOCUMENT COMPLETENESS</span>
              <h2>Required documents</h2>
              <div className="completeness-label">
                <strong>
                  {checked
                    ? `${present} of ${REQUIRED_DOCUMENTS.length} received`
                    : "Completeness not checked"}
                </strong>
                <span>Demo checklist</span>
              </div>
              {checked && (
                <progress
                  max={REQUIRED_DOCUMENTS.length}
                  value={present}
                  aria-label="Required documents received"
                />
              )}
            </div>
            <div className="document-list">
              {REQUIRED_DOCUMENTS.map(([filename, label]) => (
                <div
                  className={`document-row ${
                    checked && missing.has(filename) ? "missing" : ""
                  }`}
                  key={filename}
                >
                  <span
                    className={`document-check ${
                      !checked
                        ? "unchecked"
                        : missing.has(filename)
                          ? "missing"
                          : ""
                    }`}
                  >
                    {!checked ? (
                      <CircleHelp size={15} />
                    ) : missing.has(filename) ? (
                      <X size={15} />
                    ) : (
                      <Check size={15} />
                    )}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <span>
                      {!checked
                        ? "Not checked"
                        : missing.has(filename)
                          ? "Not received"
                          : "Present under demo checklist"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="checklist-footer">
              <Button variant="outline" onClick={onUpload}>
                <Upload size={16} />
                Upload documents
              </Button>
            </div>
          </section>
          <section className="next-step-card">
            <span className="panel-icon">
              <ArrowRight size={19} />
            </span>
            <span className="eyebrow">NEXT STEP</span>
            <h2>
              {account.issues.length
                ? "Resolve findings and recheck"
                : "Complete human review"}
            </h2>
            <p>
              {account.issues[0]?.action ||
                "Review the source documents before proceeding."}
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
