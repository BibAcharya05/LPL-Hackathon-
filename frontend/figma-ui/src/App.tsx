import { useEffect, useState } from "react";
import UploadPanel from "./UploadPanel";
type Status = "Ready" | "Missing Info" | "Flagged" | "Submitted";

type Source = {
  document: string;
  page?: number | null;
  label?: string;
  value?: string;
};

type Issue = {
  code: string;
  severity: string;
  message: string;
  action: string;
  sources: Source[];
  expected_document?: string;
};

type Account = {
  account_id: string;
  client_name: string | null;
  account_type: string | null;
  status: Status;
  summary: string;
  summary_source?: string;
  processing_status: string;
  checks_completed?: string[];
  issues: Issue[];
  observations?: {
    code: string;
    message: string;
    sources: Source[];
  }[];
};

type ApiResponse = {
  mode: string;
  accounts: Account[];
};

const REQUIRED_DOCUMENTS = [
  ["01_existing_account_statement.pdf", "Account statement"],
  ["02_new_account_application.pdf", "Account application"],
  ["03_account_transfer_form.pdf", "Transfer form"],
  ["04_investor_profile.pdf", "Investor profile"],
  ["05_beneficiary_designation.pdf", "Beneficiary designation"],
  ["06_advisory_agreement.pdf", "Advisory agreement"],
];

// Your frontend and backend share the workshop CloudFront domain.
const API_URL = "/ports/8000/api/accounts";

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`status-chip status-${status.toLowerCase().replace(/ /g, "-")}`}
    >
      <span className="status-dot" />
      {status}
    </span>
  );
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");
  const [lastLoaded, setLastLoaded] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  async function loadAccounts() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}?refresh=${Date.now()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (!Array.isArray(data.accounts)) {
        throw new Error("Unexpected backend response.");
      }

      setAccounts(data.accounts);
      setMode(data.mode);
      setLastLoaded(new Date().toLocaleTimeString());

      setSelectedId((current) =>
        data.accounts.some((account) => account.account_id === current)
          ? current
          : null,
      );
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Could not load account results.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  const selected = accounts.find(
    (account) => account.account_id === selectedId,
  );

  const visibleAccounts = accounts.filter((account) => {
    const matchesStatus = filter === "All" || account.status === filter;
    const text = `${account.client_name ?? ""} ${account.account_id}`.toLowerCase();
    return matchesStatus && text.includes(search.toLowerCase());
  });

  const cards = [
    { label: "Active Transitions", filter: "All", tone: "navy" },
    { label: "Ready", filter: "Ready", tone: "green" },
    { label: "Missing Info", filter: "Missing Info", tone: "yellow" },
    { label: "Flagged", filter: "Flagged", tone: "red" },
    { label: "Submitted", filter: "Submitted", tone: "blue" },
  ];

  const missingDocuments = new Set(
    (selected?.issues ?? [])
      .filter((issue) => issue.code === "MISSING_DOCUMENT")
      .map((issue) => issue.expected_document),
  );

  const completenessChecked =
    selected?.checks_completed?.includes("required_documents") ?? false;

  const receivedCount = REQUIRED_DOCUMENTS.filter(
    ([filename]) => !missingDocuments.has(filename),
  ).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setSelectedId(null)}>
          <span className="brand-mark">⇄</span>
          <span>Transition Copilot</span>
        </button>

        <div className="topbar-actions">
          <button
            className="primary-button"
            onClick={() => void loadAccounts()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh results"}
          </button>

          <button
            className="secondary-button"
            onClick={() => setUploadOpen(true)}
          >
            Upload documents
          </button>

          <div className="user-avatar">TC</div>
        </div>
      </header>

      <aside className="sidebar">
        <nav className="nav-list" aria-label="Main navigation">
          <button
            className={`nav-item ${!selected ? "active" : ""}`}
            onClick={() => setSelectedId(null)}
          >
            Dashboard
          </button>

          <button
            className={`nav-item ${selected ? "active" : ""}`}
            onClick={() => setSelectedId(null)}
          >
            Transitions
            <span className="nav-count">{accounts.length}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div>
            <strong>Synthetic demo</strong>
            <span>Human review required</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="page">
          <p className="heading-subtitle" role="status">
            {loading
              ? "Loading saved account results…"
              : `Data: ${mode || "unavailable"} · Last fetched: ${lastLoaded || "not yet"}`}
          </p>

          {error && (
            <div role="alert" style={{ color: "#a52a2a", marginBottom: 20 }}>
              Could not refresh: {error}. Ensure the backend is running on
              port 8000.
              {accounts.length > 0 && " Previously loaded results remain visible."}
            </div>
          )}

          {!selected ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Transition operations</p>
                  <h1>Advisor Transition Dashboard</h1>
                  <p className="heading-subtitle">
                    Review transition packets and identify items needing attention.
                  </p>
                </div>
              </div>

              <section className="summary-grid" aria-label="Transition summary">
                {cards.map((card) => {
                  const count =
                    card.filter === "All"
                      ? accounts.length
                      : accounts.filter(
                          (account) => account.status === card.filter,
                        ).length;

                  return (
                    <button
                      key={card.label}
                      className={`summary-card ${filter === card.filter ? "selected" : ""}`}
                      onClick={() => setFilter(card.filter)}
                      aria-pressed={filter === card.filter}
                    >
                      <div className={`summary-icon tone-${card.tone}`}>⇄</div>
                      <span className="summary-label">{card.label}</span>
                      <strong className="summary-value">{count}</strong>
                      <span className="summary-note">
                        {card.filter === "Ready"
                          ? "Ready for human review"
                          : card.filter === "Submitted"
                            ? "Simulated submissions"
                            : "Loaded account results"}
                      </span>
                    </button>
                  );
                })}
              </section>

              <section className="table-card">
                <div className="table-toolbar">
                  <div>
                    <h2>Transition accounts</h2>
                    <input
                      aria-label="Search accounts"
                      placeholder="Search client or account ID"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #dce3ec",
                        borderRadius: 8,
                      }}
                    />
                  </div>

                  <div className="filter-tabs" aria-label="Filter transitions">
                    {cards.map((card) => (
                      <button
                        key={card.filter}
                        className={filter === card.filter ? "active" : ""}
                        onClick={() => setFilter(card.filter)}
                      >
                        {card.filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Account</th>
                        <th>Status</th>
                        <th>Issues</th>
                        <th>Main reason</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleAccounts.map((account) => (
                        <tr key={account.account_id}>
                          <td>
                            <div className="client-cell">
                              <div className="client-avatar">
                                {(account.client_name || "Unknown")
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")}
                              </div>
                              <div>
                                <strong>{account.client_name || "Unknown client"}</strong>
                                <span>{account.account_id}</span>
                              </div>
                            </div>
                          </td>
                          <td>{account.account_type || "Unavailable"}</td>
                          <td><StatusChip status={account.status} /></td>
                          <td>
                            <span
                              className={`issue-count ${account.issues.length ? "active" : ""}`}
                            >
                              {account.issues.length}
                            </span>
                          </td>
                          <td className="reason-cell">
                            {account.issues[0]?.message || "No issues reported"}
                          </td>
                          <td>
                            <button
                              className="secondary-button"
                              onClick={() => {
                                setSelectedId(account.account_id);
                                window.scrollTo(0, 0);
                              }}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!loading && !visibleAccounts.length && (
                    <p style={{ padding: 24 }}>No matching accounts.</p>
                  )}
                </div>

                <div className="table-footer">
                  <span>
                    Showing {visibleAccounts.length} of {accounts.length} accounts
                  </span>
                  <span>Synthetic test data</span>
                </div>
              </section>
            </>
          ) : (
            <>
              <button className="back-link" onClick={() => setSelectedId(null)}>
                ← All transitions
              </button>

              <div className="detail-header">
                <div className="title-with-status">
                  <h1>{selected.client_name || "Unknown client"}</h1>
                  <StatusChip status={selected.status} />
                </div>
                <div className="metadata">
                  <span>Account: <strong>{selected.account_type}</strong></span>
                  <span>Transition ID: <strong>{selected.account_id}</strong></span>
                  <span>Processing: <strong>{selected.processing_status}</strong></span>
                </div>
              </div>

              <div className="detail-layout">
                <div className="detail-primary">
                  <section className="ai-summary-card">
                    <div className="ai-summary-icon">✦</div>
                    <div>
                      <div className="section-kicker">
                        {selected.summary_source === "bedrock"
                          ? "Bedrock-generated summary"
                          : "Rule-check summary"}
                      </div>
                      <h2>Transition Copilot Summary</h2>
                      <p>{selected.summary}</p>
                      <div className="ai-disclaimer">
                        Verify against source documents · Human review required
                      </div>
                    </div>
                  </section>

                  <section className="issues-section">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">Review queue</p>
                        <h2>Items needing attention</h2>
                      </div>
                      <span>{selected.issues.length} findings</span>
                    </div>

                    <div className="issue-list">
                      {selected.issues.map((issue, index) => (
                        <article
                          className="issue-card"
                          key={`${issue.code}-${index}`}
                          style={{ textAlign: "left" }}
                        >
                          <div className="issue-card-top">
                            <div>
                              <StatusChip status={issue.severity} />
                              <h3>{issue.message}</h3>
                            </div>
                          </div>

                          <p>{issue.action}</p>

                          {issue.expected_document && (
                            <p>Expected document: {issue.expected_document}</p>
                          )}

                          {issue.sources.length > 0 && (
                            <div className="comparison-values">
                              {issue.sources.map((source, sourceIndex) => (
                                <div key={sourceIndex}>
                                  <span>{source.label || "Source"}</span>
                                  <strong>{source.value || "Inspect document"}</strong>
                                  <small>
                                    {source.document}
                                    {source.page ? ` · Page ${source.page}` : ""}
                                  </small>
                                </div>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}

                      {!selected.issues.length && (
                        <p>
                          No findings from the implemented checks.
                          Human review is still required.
                        </p>
                      )}
                    </div>
                  </section>

                  {(selected.observations?.length ?? 0) > 0 && (
                    <section className="next-step-card">
                      <strong>Review notes</strong>
                      {selected.observations?.map((note, index) => (
                        <p key={index}>
                          {note.message}
                          {" "}
                          {note.sources.map((source) => source.document).join(", ")}
                        </p>
                      ))}
                    </section>
                  )}
                </div>

                <aside className="detail-sidebar">
                  <section className="checklist-card">
                    <div className="checklist-heading">
                      <div>
                        <p className="eyebrow">Demo checklist</p>
                        <h2>Required documents</h2>
                      </div>
                      <span>
                        {completenessChecked
                          ? `${receivedCount} of ${REQUIRED_DOCUMENTS.length}`
                          : "Not checked"}
                      </span>
                    </div>

                    <div className="document-list">
                      {REQUIRED_DOCUMENTS.map(([filename, label]) => {
                        const missing = missingDocuments.has(filename);
                        return (
                          <div
                            className={`document-row ${missing ? "missing" : ""}`}
                            key={filename}
                          >
                            <span
                              className={`document-check ${missing ? "missing" : ""}`}
                            >
                              {!completenessChecked ? "?" : missing ? "×" : "✓"}
                            </span>
                            <div>
                              <strong>{label}</strong>
                              <span>
                                {!completenessChecked
                                  ? "Not checked"
                                  : missing
                                    ? "Not received"
                                    : "Present under demo checklist"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="next-step-card">
                    <span className="next-step-label">Next step</span>
                    <strong>
                      {selected.issues.length
                        ? "Resolve findings and recheck"
                        : "Complete human review"}
                    </strong>
                    <p>
                      {selected.issues[0]?.action ||
                        "Review the source documents before proceeding."}
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}

          <p className="heading-subtitle" style={{ marginTop: 24 }}>
            Demo checklist only. Ready means ready for human review.
            No transfer submission or signature authentication.
          </p>
        </div>
      </main>
      {uploadOpen && (
  <UploadPanel
    onClose={() => setUploadOpen(false)}
    onComplete={() => {
      setUploadOpen(false);
      void loadAccounts();
    }}
  />
)}
    </div>
  );
}