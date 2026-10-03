import { FileCheck2 } from "lucide-react"
import AgentReview from "./components/agent-review"
import BookOverview from "./components/book-overview"
import SpecialistQueue from "./components/specialist-queue"
import { accountValue } from "./lib/assessment"
import HumanReview from "./components/human-review"
import { useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowRightLeft,
  CircleCheck,
  CircleHelp,
  Clock3,
  FileClock,
  FolderOpen,
  LayoutDashboard,
  ListFilter,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react"
import UploadPanel from "./UploadPanel"
import AccountReview from "./components/account-review"
import Button from "./components/ui/button"
import DialogContent, {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "./components/ui/dialog"
import StatusChip from "./components/status-chip"
import { initials, type Account } from "./lib/transitions"

// Keep requests relative to the deployed workshop path as well as localhost.
const API_URL = new URL("./api/accounts", window.location.href).pathname
const CARDS = [
  {
    label: "Active Transitions",
    filter: "All",
    tone: "navy",
    icon: ArrowRightLeft,
    note: "Your account overview",
  },
  {
    label: "Ready",
    filter: "Ready",
    tone: "green",
    icon: CircleCheck,
    note: "Ready for human review",
  },
  {
    label: "Missing Info",
    filter: "Missing Info",
    tone: "yellow",
    icon: FileClock,
    note: "Documents need attention",
  },
  {
    label: "Flagged",
    filter: "Flagged",
    tone: "red",
    icon: TriangleAlert,
    note: "Findings to investigate",
  },
  {
    label: "Submitted",
    filter: "Submitted",
    tone: "blue",
    icon: Send,
    note: "Simulated submissions",
  },
]

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [section, setSection] = useState("Dashboard")
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastLoaded, setLastLoaded] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches,
  )
  const [sort, setSort] = useState<"asc" | "desc" | null>(null)
  const uploadTrigger = useRef<HTMLButtonElement>(null)
  const sidebarTrigger = useRef<HTMLButtonElement>(null)
  const pageTitle = useRef<HTMLHeadingElement>(null)
  const tableSection = useRef<HTMLElement>(null)
  const inFlight = useRef(false)

  async function loadAccounts() {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError("")
    try {
      const response = await fetch(API_URL, { cache: "no-store" })
      if (!response.ok)
        throw new Error(`The account service returned HTTP ${response.status}.`)
      const data: { accounts: Account[] } = await response.json()
      if (!Array.isArray(data.accounts))
        throw new Error("The account service returned an unexpected response.")
      setAccounts(data.accounts)
      setLastLoaded(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      )
      setSelectedId((current) =>
        data.accounts.some((account) => account.account_id === current)
          ? current
          : null,
      )
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "The account service could not be reached.",
      )
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAccounts()
  }, [])
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const closeDrawer = () => {
      setIsMobile(!media.matches)
      if (media.matches) setMobileOpen(false)
    }
    media.addEventListener("change", closeDrawer)
    return () => media.removeEventListener("change", closeDrawer)
  }, [])

  const selected = accounts.find((account) => account.account_id === selectedId)
  const countFor = (status: string) =>
    status === "All"
      ? accounts.length
      : accounts.filter((account) => account.status === status).length
  const attentionCount = countFor("Flagged") + countFor("Missing Info")
  const visibleAccounts = accounts.filter((account) => {
    const text =
      `${account.client_name ?? ""} ${account.account_id}`.toLowerCase()
    return (
      (filter === "All" || account.status === filter) &&
      text.includes(search.toLowerCase().trim())
    )
  })
  if (sort)
    visibleAccounts.sort(
      (a, b) =>
        (a.client_name ?? "").localeCompare(b.client_name ?? "") *
        (sort === "asc" ? 1 : -1),
    )
  const initialLoading = loading && !lastLoaded

  function navigate(nextSection: string) {
    setSelectedId(null)
    setSection(nextSection)
    setMobileOpen(false)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      if (nextSection === "Transitions")
        document.getElementById("specialist-title")?.focus({ preventScroll: true })
      pageTitle.current?.focus({ preventScroll: true })
    })
  }

  function selectAccount(account: Account) {
    setSelectedId(account.account_id)
    setSection("Transitions")
    window.scrollTo(0, 0)
    requestAnimationFrame(() =>
      document.getElementById("review-title")?.focus(),
    )
  }

  const navigation = (
    <>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {[
          { name: "Dashboard", icon: LayoutDashboard },
          { name: "Transitions", icon: FolderOpen },
        ].map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={`nav-item ${section === name ? "active" : ""}`}
            title={collapsed ? (name === "Transitions" ? "LPL Specialist Review" : name) : undefined}
            aria-label={name === "Transitions" ? "LPL Specialist Review" : name}
            aria-current={section === name ? "page" : undefined}
            onClick={() => navigate(name)}
          >
            <Icon size={19} aria-hidden="true" />
            <span className="nav-label">{name === "Transitions" ? "LPL Specialist Review" : name}</span>
            {name === "Transitions" && (
              <span className="nav-count">
                {lastLoaded ? accounts.length : "—"}
              </span>
            )}
          </button>
        ))}
      </nav>
<div className="sidebar-footer">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong>Synthetic demo</strong>
          <span>Human review required</span>
        </div>
      </div>
    </>
  )

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="topbar">
        <div className="topbar-brand">
          <Button
            ref={sidebarTrigger}
            variant="ghost"
            size="icon"
            className="nav-toggle"
            aria-label={collapsed ? "Expand navigation" : "Toggle navigation"}
            aria-controls={
              isMobile ? "mobile-navigation" : "desktop-navigation"
            }
            aria-expanded={isMobile ? mobileOpen : !collapsed}
            onClick={() =>
              window.matchMedia("(max-width: 1023px)").matches
                ? setMobileOpen(true)
                : setCollapsed(!collapsed)
            }
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </Button>
          <button className="brand" onClick={() => navigate("Dashboard")}>
            <span className="brand-mark">
              <FileCheck2 size={22} aria-hidden="true" />
            </span>
            <span>
              Transition <strong>Copilot</strong>
            </span>
          </button>
          <span className="workspace-label">ADVISOR WORKSPACE</span>
        </div>
        <div className="topbar-actions">
          <Button
            variant="ghost"
            className="refresh-button"
            aria-label="Refresh results"
            onClick={() => void loadAccounts()}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "spin" : ""}
              aria-hidden="true"
            />
            <span>{loading ? "Refreshing…" : "Refresh results"}</span>
          </Button>
          <Button
            ref={uploadTrigger}
            aria-label="Upload documents"
            className="upload-button"
            onClick={() => setUploadOpen(true)}
          >
            <Upload size={16} aria-hidden="true" />
            <span>Upload documents</span>
          </Button>
          <div
            className="user-avatar"
            aria-label="Transition Copilot workspace"
          >
            TC
          </div>
        </div>
      </header>
      <aside id="desktop-navigation" className="sidebar">
        {navigation}
      </aside>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          id="mobile-navigation"
          className="navigation-drawer"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            sidebarTrigger.current?.focus()
          }}
        >
          <div className="drawer-heading">
            <DialogTitle>Workspace</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Navigate your advisor workspace.
          </DialogDescription>
          {navigation}
        </DialogContent>
      </Dialog>
      <main id="main-content" className="main-content" tabIndex={-1}>
        <div className="page">
          <div className="page-utility">
            <div className="breadcrumb">
              <span>Workspace</span>
              <span aria-hidden="true">/</span>
              <span>{selected ? "Account review" : section === "Transitions" ? "LPL Specialist Review" : section}</span>
            </div>
            <span className="last-updated" role="status">
              <Clock3 size={13} aria-hidden="true" />
              {loading
                ? "Refreshing results…"
                : lastLoaded
                  ? `Last updated ${lastLoaded}`
                  : "Awaiting account results"}
            </span>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <TriangleAlert size={20} aria-hidden="true" />
              <div>
                <strong>Unable to refresh accounts</strong>
                <p>
                  {error} Please try again.
                  {lastLoaded && " Previously loaded results are shown below."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadAccounts()}
                disabled={loading}
              >
                Try again
              </Button>
            </div>
          )}
          {!selected && section === "Transitions" ? (
            <SpecialistQueue accounts={accounts} onReview={selectAccount} />
          ) : !selected ? (
            <>
              <div className="page-heading">
                <div>
                  <h1 ref={pageTitle} tabIndex={-1}>
                    Advisor Transition Dashboard
                  </h1>
                  <p>
                    Review account readiness and resolve outstanding findings.
                  </p>
                </div>
                <span className="workspace-badge">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Transition operations
                </span>
              </div>
              {lastLoaded && <BookOverview accounts={accounts} />}
              <section
                className="summary-grid"
                aria-label="Transition summary"
                aria-busy={initialLoading}
              >
                {CARDS.map(
                  ({ label, filter: cardFilter, tone, icon: Icon }) => (
                    <button
                      key={label}
                      className={`summary-card tone-${tone} ${
                        filter === cardFilter ? "selected" : ""
                      }`}
                      aria-pressed={filter === cardFilter}
                      onClick={() => setFilter(cardFilter)}
                    >
                      <span className="summary-card-top">
                        <span className="summary-label">{label}</span>
                        <span className="summary-icon">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                      </span>
                      <strong className="summary-value">
                        {lastLoaded ? (
                          countFor(cardFilter)
                        ) : (
                          <span
                            className={
                              initialLoading ? "skeleton metric-skeleton" : ""
                            }
                          >
                            {initialLoading ? "" : "—"}
                          </span>
                        )}
                      </strong>
                      
                    </button>
                  ),
                )}
              </section>
              <section
                className="table-card"
                ref={tableSection}
                aria-labelledby="accounts-title"
              >
                <div className="table-heading">
                  <div>
                    <h2 id="accounts-title">
                      Transition accounts{" "}
                      <span className="count-label">
                        {lastLoaded ? accounts.length : "—"}
                      </span>
                    </h2>
                    <p>
                      Review readiness and take the next step for each account.
                    </p>
                  </div>
                  {lastLoaded && (
                    <span className="attention-label">
                      <span
                        className={
                          attentionCount ? "attention-dot" : "ready-dot"
                        }
                      />
                      {attentionCount
                        ? `${attentionCount} ${
                            attentionCount === 1
                              ? "account needs"
                              : "accounts need"
                          } attention`
                        : "No accounts needing attention"}
                    </span>
                  )}
                </div>
                <div className="table-toolbar">
                  <div className="search-field">
                    <Search size={17} aria-hidden="true" />
                    <label className="sr-only" htmlFor="account-search">
                      Search accounts
                    </label>
                    <input
                      id="account-search"
                      placeholder="Search client or account ID"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && (
                      <button
                        aria-label="Clear search"
                        className="search-clear"
                        onClick={() => setSearch("")}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <div className="filter-group">
                    <ListFilter size={16} aria-hidden="true" />
                    <div
                      className="filter-tabs"
                      role="group"
                      aria-label="Filter transitions"
                    >
                      {CARDS.map((card) => (
                        <button
                          key={card.filter}
                          aria-pressed={filter === card.filter}
                          className={filter === card.filter ? "active" : ""}
                          onClick={() => setFilter(card.filter)}
                        >
                          {card.filter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div
                  className="table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Transition accounts table; scroll horizontally on smaller screens"
                  aria-busy={initialLoading}
                >
                  <table>
                    <thead>
                      <tr>
                        <th
                          aria-sort={
                            sort === "asc"
                              ? "ascending"
                              : sort === "desc"
                                ? "descending"
                                : "none"
                          }
                        >
                          <button
                            className="sort-button"
                            onClick={() =>
                              setSort(sort === "asc" ? "desc" : "asc")
                            }
                          >
                            Client
                            {sort === "asc" ? (
                              <ArrowUp size={13} />
                            ) : sort === "desc" ? (
                              <ArrowDown size={13} />
                            ) : (
                              <ArrowUpDown size={13} />
                            )}
                          </button>
                        </th>
                        <th>Account value</th>
                        <th>Account</th>
                        <th>Status</th>
                        <th>Human review</th>
                        <th className="numeric">Issues</th>
                        <th>Main reason</th>
                        <th>
                          <span className="sr-only">Review account</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialLoading
                        ? Array.from({ length: 3 }, (_, index) => (
                            <tr key={index} aria-hidden="true">
                              {Array.from({ length: 8 }, (_, column) => (
                                <td key={column}>
                                  <span className="skeleton row-skeleton" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : visibleAccounts.map((account) => (
                            <tr key={account.account_id}>
                              <td>
                                <div className="client-cell">
                                  <span className="client-avatar">
                                    {initials(account.client_name)}
                                  </span>
                                  <div>
                                    <strong>
                                      {account.client_name || "Unknown client"}
                                    </strong>
                                    <span>{account.account_id}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="value-cell">{accountValue(account).label}</td>
                              <td className="account-type">
                                {account.account_type || "Unavailable"}
                              </td>
                              <td>
                                <StatusChip status={account.status} />
                              </td>
                              <td>
                                {account.review_status === "approved"
                                  ? "Approved"
                                  : account.review_status === "corrections_requested"
                                    ? "Corrections requested"
                                    : "Pending review"}
                              </td>
                              <td className="numeric">
                                <span
                                  className={`issue-count ${
                                    account.issues.length ? "has-issues" : ""
                                  }`}
                                >
                                  {account.issues.length}
                                </span>
                              </td>
                              <td className="reason-cell">
                                {account.issues[0]?.message || (
                                  <span className="no-issues">
                                    <CircleCheck size={14} aria-hidden="true" />
                                    No issues reported
                                  </span>
                                )}
                              </td>
                              <td>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="review-button"
                                  aria-label={`Review ${account.client_name || account.account_id}`}
                                  onClick={() => selectAccount(account)}
                                >
                                  Review
                                  <ArrowRight size={14} aria-hidden="true" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
                {!initialLoading && !visibleAccounts.length && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      {error && !lastLoaded ? (
                        <CircleHelp size={27} />
                      ) : (
                        <FolderOpen size={27} />
                      )}
                    </div>
                    <h3>
                      {error && !lastLoaded
                        ? "Account results are unavailable"
                        : search || filter !== "All"
                          ? "No matching accounts"
                          : "Your next transition starts here"}
                    </h3>
                    <p>
                      {error && !lastLoaded
                        ? "Reconnect to the account service and try refreshing."
                        : search || filter !== "All"
                          ? "Try another name or account ID, or clear your filters."
                          : "Upload a synthetic document packet to begin your review."}
                    </p>
                    {search || filter !== "All" ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearch("")
                          setFilter("All")
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      !error && (
                        <Button onClick={() => setUploadOpen(true)}>
                          <Upload size={16} />
                          Upload documents
                        </Button>
                      )
                    )}
                  </div>
                )}
                <div className="table-footer">
                  <span>
                    {initialLoading ? (
                      <>
                        <LoaderCircle className="spin" size={14} />
                        Loading accounts…
                      </>
                    ) : (
                      `Showing ${visibleAccounts.length} of ${accounts.length} accounts`
                    )}
                  </span>
                  <span>Ready means ready for human review</span>
                </div>
              </section>

            </>
          ) : (
            <>
              <AccountReview
                account={selected}
                onBack={() => navigate("Transitions")}
                onUpload={() => setUploadOpen(true)}
              />
              <AgentReview
                key={"agent:" + selected.account_id + ":" + (selected.packet_version || "")}
                account={selected}
              />
              <HumanReview
                key={selected.account_id + ":" + (selected.packet_version || "")}
                account={selected}
                onSaved={loadAccounts}
              />
            </>
          )}
          <footer className="page-footer">
            <span>
              Transition Copilot <span className="footer-divider">/</span>{" "}
              Advisor workspace
            </span>
            <span>
              Synthetic demo · No transfer submission or signature
              authentication
            </span>
          </footer>
        </div>
      </main>
      {uploadOpen && (
        <UploadPanel
          initialPacketId={selected?.account_id}
          onClose={() => setUploadOpen(false)}
          onComplete={() => {
            setUploadOpen(false)
            void loadAccounts()
          }}
          onRestoreFocus={() => uploadTrigger.current?.focus()}
        />
      )}
    </div>
  )
}
