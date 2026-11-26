import { useEffect, useState, type ReactNode } from "react";

type Page = "Foundations" | "Core screens" | "Phase 2 (stretch)";
type AlertLevel = "Info" | "Warning" | "Escalated" | "Emergency";
type Status =
  | "OK"
  | "No data"
  | "Active"
  | "Inactive"
  | "Discharged"
  | "Needs review"
  | "Warning"
  | "Escalated"
  | "Emergency"
  | "Resolved";
type Viewport = "Mobile 375" | "Tablet 768" | "Desktop 1280";
type StretchScreen =
  | "Audio reminders"
  | "Add audio reminder"
  | "Activity recognition"
  | "Changes noticed"
  | "Patient trends"
  | "Family trends"
  | "Weekly report"
  | "Report email"
  | "Reminder prototype";
type Screen =
  | "Sign-in"
  | "Nurse dashboard"
  | "Alert detail"
  | "Patient page"
  | "Family home"
  | "Admin patients"
  | "Add patient"
  | "Admin patient detail"
  | "Admin users"
  | "Add user"
  | "Admin user detail"
  | "Admin rooms"
  | "Admin settings"
  | "Account"
  | "Notification previews"
  | "Global states"
  | "Prototype flows";
type IconName =
  | "account"
  | "alert"
  | "arrow"
  | "check"
  | "clock"
  | "close"
  | "dashboard"
  | "escalated"
  | "eyeOff"
  | "home"
  | "info"
  | "lock"
  | "menu"
  | "more"
  | "moon"
  | "patients"
  | "review"
  | "rooms"
  | "settings"
  | "sun"
  | "users";

const pageNames: Page[] = ["Foundations", "Core screens", "Phase 2 (stretch)"];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    account: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    alert: (
      <>
        <path d="M12 4 3 20h18L12 4Z" />
        <path d="M12 10v4m0 3h.01" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    escalated: <path d="M12 4 21 20H3L12 4Z" fill="currentColor" stroke="none" />,
    eyeOff: (
      <>
        <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A11 11 0 0 1 12 4c5.5 0 9 6 9 8a9.5 9.5 0 0 1-2 3.4M6.7 6.7C4.3 8.2 3 10.7 3 12c0 2 3.5 8 9 8 1.3 0 2.5-.3 3.5-.8" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    moon: <path d="M20.5 15.3A9 9 0 0 1 8.7 3.5a9 9 0 1 0 11.8 11.8Z" />,
    patients: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0m2-8a3 3 0 1 0 0-6m4 14a6 6 0 0 0-4-5.7" />
      </>
    ),
    review: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h5m2 5 1.5 1.5L20 15" />
      </>
    ),
    rooms: (
      <>
        <path d="M4 21V3h12v18M8 7h4M8 11h4M8 15h4m4-7h4v13" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 15.5 21 17l-4 4-1.5-2a8 8 0 0 1-3.5 1l-.5 2h-5l-.5-2a8 8 0 0 1-3-2L2 16l2-3a8 8 0 0 1 0-3L2 7l4-4 2 1a8 8 0 0 1 3-.5L12 2h4l.5 2a8 8 0 0 1 3 2L22 7l-2 3a8 8 0 0 1-1 5.5Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    users: (
      <>
        <circle cx="8" cy="8" r="4" />
        <path d="M1 21a7 7 0 0 1 14 0m4-9v6m-3-3h6" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const alertIcons: Record<AlertLevel, IconName> = {
  Info: "info",
  Warning: "alert",
  Escalated: "escalated",
  Emergency: "close",
};

function AlertBadge({ level }: { level: AlertLevel }) {
  return (
    <span className={`badge alert-badge badge-${level.toLowerCase()}`}>
      <Icon name={alertIcons[level]} size={15} />
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const key = status.toLowerCase().replace(" ", "-");
  return (
    <span className={`badge status-badge status-${key}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function LiveIndicator({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`live-indicator ${paused ? "paused" : ""}`}>
      <span />
      {paused ? "Live updates paused" : "Live · updated 14:22"}
    </span>
  );
}

function Button({
  children,
  variant = "primary",
  size = "default",
  disabled,
  loading,
  onClick,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "default" | "large";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`button button-${variant} button-${size} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={value === option ? "selected" : ""}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  type = "input",
  placeholder = "Enter a value",
  options,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  type?: "input" | "password" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
  required?: boolean;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <label className={`field ${error ? "field-error" : ""}`} htmlFor={id}>
      <span>{label}</span>
      {type === "select" ? (
        <select id={id} defaultValue="" required={required}>
          <option value="" disabled>
            Select an option
          </option>
          {(options ?? ["Walker", "Cane"]).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea id={id} placeholder={placeholder} required={required} />
      ) : (
        <input
          id={id}
          type={type === "password" ? "password" : "text"}
          placeholder={placeholder}
          required={required}
        />
      )}
      {(hint || error) && <small>{error || hint}</small>}
    </label>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ThemeSpecimen({ mode }: { mode: "light" | "dark" }) {
  return (
    <div className="theme-specimen" data-preview-theme={mode}>
      <div className="specimen-label">{mode} mode</div>
      <div className="token-colors">
        {[
          ["Surface", "surface"],
          ["Text", "text"],
          ["Primary", "primary"],
          ["Info", "info"],
          ["Warning", "warning"],
          ["Escalated", "escalated"],
          ["Emergency", "emergency"],
          ["OK", "ok"],
        ].map(([name, color]) => (
          <div className="swatch" key={name}>
            <i className={`swatch-${color}`} />
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className="specimen-group">
        <p className="mini-label">Alert badges</p>
        <div className="wrap">
          {(["Info", "Warning", "Escalated", "Emergency"] as AlertLevel[]).map((level) => (
            <AlertBadge key={level} level={level} />
          ))}
        </div>
      </div>
      <div className="specimen-group">
        <p className="mini-label">Status badges</p>
        <div className="wrap">
          {(["OK", "No data", "Active", "Inactive", "Discharged", "Needs review"] as Status[]).map(
            (status) => (
              <StatusBadge key={status} status={status} />
            ),
          )}
        </div>
      </div>
      <div className="specimen-group">
        <p className="mini-label">Buttons · 44 px default / 52 px large</p>
        <div className="wrap">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button size="large">Large button</Button>
        </div>
      </div>
      <div className="specimen-group">
        <p className="mini-label">Live status</p>
        <div className="wrap">
          <LiveIndicator />
          <LiveIndicator paused />
        </div>
      </div>
    </div>
  );
}

function ResponsiveShells() {
  const nav = [
    ["dashboard", "Dashboard"],
    ["patients", "Patients"],
    ["users", "Users"],
    ["rooms", "Rooms"],
    ["settings", "Settings"],
    ["account", "Account"],
  ] as [IconName, string][];
  return (
    <div className="shell-showcase">
      <div className="shell-preview shell-desktop">
        <span className="preview-size">Desktop · 1280</span>
        <aside>
          <b>MAC</b>
          {nav.map(([icon, text]) => (
            <span key={text}>
              <Icon name={icon} size={14} />
              {text}
            </span>
          ))}
        </aside>
        <header>Demo Admin</header>
        <main>
          <i />
          <i />
          <i />
        </main>
      </div>
      <div className="shell-preview shell-tablet">
        <span className="preview-size">Tablet · 768</span>
        <aside>
          <b>MAC</b>
          {nav.slice(0, 5).map(([icon, text]) => (
            <span key={text} title={text}>
              <Icon name={icon} size={15} />
            </span>
          ))}
        </aside>
        <header>Demo Admin</header>
        <main>
          <i />
          <i />
        </main>
      </div>
      <div className="shell-preview shell-mobile">
        <span className="preview-size">Mobile · 375</span>
        <header>
          <Icon name="menu" size={16} />
          <b>MAC</b>
          <span>DA</span>
        </header>
        <main>
          <i />
          <i />
        </main>
        <nav>
          {nav.slice(0, 4).map(([icon, text]) => (
            <span key={text} title={text}>
              <Icon name={icon} size={14} />
            </span>
          ))}
          <span title="More">
            <Icon name="more" size={14} />
          </span>
        </nav>
      </div>
    </div>
  );
}

function Foundations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">Mobility Aid Compliance</p>
        <h1>Design foundations</h1>
        <p>
          Accessible variables, components, and responsive patterns for calm clinical workflows.
        </p>
      </div>

      <section className="content-section">
        <SectionHeader
          eyebrow="Variables"
          title="One system, light and dark"
          description="Every pairing is designed for WCAG AA contrast. Focus uses a visible 3 px ring."
        />
        <div className="theme-pair">
          <ThemeSpecimen mode="light" />
          <ThemeSpecimen mode="dark" />
        </div>
        <div className="foundation-meta">
          <div>
            <span>Spacing</span>
            <strong>4 · 8 · 12 · 16 · 24 · 32 · 48</strong>
          </div>
          <div>
            <span>Radius</span>
            <strong>8 · 12</strong>
          </div>
          <div>
            <span>Type · Inter</span>
            <strong>12 · 14 · 16 · 20 · 24 · 32</strong>
          </div>
          <div>
            <span>Structure</span>
            <strong>Border · Focus ring</strong>
          </div>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow="Inputs"
          title="Form controls"
          description="Labels remain visible; hints and errors never rely on color alone."
        />
        <div className="forms-grid">
          <Field label="Patient code" hint="Use the code shown on the care plan." />
          <Field label="Mobility aid" type="select" hint="Current prescription." />
          <Field label="Patient code with error" error="Enter a valid patient code." />
          <Field label="Review note" type="textarea" hint="Optional internal note." />
          <label className="checkbox-row">
            <input type="checkbox" defaultChecked />
            <span>
              <strong>Send escalation updates</strong>
              <small>Nurse and family receive the escalation.</small>
            </span>
          </label>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader eyebrow="Composition" title="Cards and list rows" />
        <div className="component-cards">
          <article className="ui-card alert-card-sample">
            <AlertBadge level="Warning" />
            <h3>Walker not detected</h3>
            <p>Demo Patient A · P-0042 · R-204 · 14:28 UTC</p>
            <Button>Acknowledge</Button>
          </article>
          <article className="ui-card patient-card-sample">
            <div className="avatar">DA</div>
            <div>
              <h3>Demo Patient A</h3>
              <p>P-0042 · Room R-204</p>
            </div>
            <StatusBadge status="OK" />
            <dl>
              <div>
                <dt>Prescribed</dt>
                <dd>Walker</dd>
              </div>
              <div>
                <dt>Last seen</dt>
                <dd>Walker · 14:22</dd>
              </div>
            </dl>
          </article>
          <div className="ui-card list-card">
            <div className="list-row">
              <span className="row-icon">
                <Icon name="review" />
              </span>
              <div>
                <strong>Low-confidence detection</strong>
                <p>DB · R-205 · Cane 62%</p>
              </div>
              <Icon name="arrow" size={17} />
            </div>
            <div className="list-row">
              <span className="row-icon">
                <Icon name="patients" />
              </span>
              <div>
                <strong>Demo Patient B</strong>
                <p>P-0043 · R-205</p>
              </div>
              <Icon name="arrow" size={17} />
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow="Responsive data"
          title="Table to stacked cards"
          description="Desktop and tablet retain columns; mobile keeps the same information in labeled rows."
        />
        <div className="table-compare">
          <div>
            <span className="preview-chip">Desktop / tablet</span>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Room</th>
                  <th>Prescribed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Demo Patient A · P-0042</td>
                  <td>R-204</td>
                  <td>Walker</td>
                  <td>
                    <StatusBadge status="OK" />
                  </td>
                </tr>
                <tr>
                  <td>Demo Patient B · P-0043</td>
                  <td>R-205</td>
                  <td>Cane</td>
                  <td>
                    <StatusBadge status="Needs review" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mobile-data-preview">
            <span className="preview-chip">Mobile · 375</span>
            <article>
              <strong>Demo Patient A</strong>
              <StatusBadge status="OK" />
              <dl>
                <div>
                  <dt>Code</dt>
                  <dd>P-0042</dd>
                </div>
                <div>
                  <dt>Room</dt>
                  <dd>R-204</dd>
                </div>
                <div>
                  <dt>Prescribed</dt>
                  <dd>Walker</dd>
                </div>
              </dl>
            </article>
          </div>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader eyebrow="Feedback" title="Messages and system states" />
        <div className="feedback-grid">
          <div className="toast">
            <span className="message-icon">
              <Icon name="check" />
            </span>
            <div>
              <strong>Alert acknowledged</strong>
              <p>Recorded at 14:29 UTC.</p>
            </div>
            <Icon name="close" size={17} />
          </div>
          <div className="inline-message">
            <Icon name="info" />
            <p>
              <strong>No camera images are captured.</strong> Notifications show initials or patient
              ID only.
            </p>
          </div>
          <div className="empty-state">
            <span>
              <Icon name="check" />
            </span>
            <strong>All patients are fine right now.</strong>
            <p>New alerts will appear here.</p>
          </div>
          <div className="skeleton-card" aria-label="Loading">
            <i />
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <div className="dialog-demo">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open confirm dialog
          </Button>
          {dialogOpen && (
            <div className="dialog-backdrop" role="presentation">
              <div className="confirm-dialog" role="dialog" aria-modal="true">
                <span className="danger-icon">
                  <Icon name="alert" />
                </span>
                <h3>Discharge this patient?</h3>
                <p>Demo Patient A will no longer appear in active monitoring.</p>
                <div>
                  <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={() => setDialogOpen(false)}>
                    Confirm discharge
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow="Responsive app shell"
          title="Navigation changes by breakpoint"
          description="Desktop uses a 220 px sidebar, tablet collapses it, and mobile uses a top bar plus five-item bottom navigation."
        />
        <ResponsiveShells />
        <div className="role-nav">
          <div>
            <strong>Nurse</strong>
            <span>Dashboard · Account</span>
          </div>
          <div>
            <strong>Family</strong>
            <span>Home · Account</span>
          </div>
          <div>
            <strong>Admin</strong>
            <span>Dashboard · Patients · Users · Rooms · Settings · Account</span>
          </div>
        </div>
        <div className="grid-note">
          <span>Mobile · 4 columns · 16 px margin</span>
          <span>Tablet · 8 columns · 24 px margin</span>
          <span>Desktop · 12 columns · 32 px margin · 1200 max</span>
        </div>
      </section>
    </div>
  );
}

function PreviewShell({
  viewport,
  dark,
  showChrome = true,
  role = "nurse",
  activeNav,
  children,
}: {
  viewport: Viewport;
  dark?: boolean;
  showChrome?: boolean;
  role?: "nurse" | "family" | "admin";
  activeNav?: "Dashboard" | "Home" | "Patients" | "Users" | "Rooms" | "Settings" | "Account";
  children: ReactNode;
}) {
  const size = viewport.split(" ")[0].toLowerCase();
  const isFamily = role === "family";
  const isAdmin = role === "admin";
  const selectedNav = activeNav ?? (isFamily ? "Home" : isAdmin ? "Patients" : "Dashboard");
  return (
    <div className={`screen-stage stage-${size}`}>
      <div
        className={`product-preview viewport-${size}`}
        data-preview-theme={dark ? "dark" : "light"}
      >
        {showChrome && (
          <>
            <div className="product-topbar">
              {size !== "desktop" && <Icon name="menu" size={18} />}
              <span className="product-logo">
                <i>
                  <Icon name={isFamily ? "home" : isAdmin ? "patients" : "dashboard"} size={14} />
                </i>
                <b>Mobility Aid Compliance</b>
              </span>
              <span className="preview-account">{isFamily ? "DF" : isAdmin ? "DA" : "DN"}</span>
            </div>
            {size === "desktop" && (
              <aside className="product-sidebar">
                <span
                  className={
                    selectedNav === (isFamily ? "Home" : isAdmin ? "Patients" : "Dashboard")
                      ? "active"
                      : ""
                  }
                >
                  <Icon name={isFamily ? "home" : isAdmin ? "patients" : "dashboard"} size={17} />{" "}
                  {isFamily ? "Home" : isAdmin ? "Patients" : "Dashboard"}
                </span>
                {isAdmin && (
                  <>
                    <span className={selectedNav === "Dashboard" ? "active" : ""}>
                      <Icon name="dashboard" size={17} /> Dashboard
                    </span>
                    <span className={selectedNav === "Users" ? "active" : ""}>
                      <Icon name="users" size={17} /> Users
                    </span>
                    <span className={selectedNav === "Rooms" ? "active" : ""}>
                      <Icon name="rooms" size={17} /> Rooms
                    </span>
                    <span className={selectedNav === "Settings" ? "active" : ""}>
                      <Icon name="settings" size={17} /> Settings
                    </span>
                  </>
                )}
                <span className={selectedNav === "Account" ? "active" : ""}>
                  <Icon name="account" size={17} /> Account
                </span>
                <div className="sidebar-privacy">
                  <Icon name="eyeOff" size={16} />
                  No camera images are captured
                </div>
              </aside>
            )}
          </>
        )}
        <div className={`product-content ${showChrome ? "" : "auth-product-content"}`}>
          {children}
        </div>
        {showChrome && size === "mobile" && (
          <nav className="product-bottom-nav">
            <span
              className={
                selectedNav === (isFamily ? "Home" : isAdmin ? "Patients" : "Dashboard")
                  ? "active"
                  : ""
              }
            >
              <Icon name={isFamily ? "home" : isAdmin ? "patients" : "dashboard"} size={18} />
              {isFamily ? "Home" : isAdmin ? "Patients" : "Dashboard"}
            </span>
            {isAdmin && (
              <>
                <span className={selectedNav === "Users" ? "active" : ""}>
                  <Icon name="users" size={18} />
                  Users
                </span>
                <span className={selectedNav === "Rooms" ? "active" : ""}>
                  <Icon name="rooms" size={18} />
                  Rooms
                </span>
              </>
            )}
            <span className={selectedNav === "Account" ? "active" : ""}>
              <Icon name="account" size={18} />
              Account
            </span>
            <span className={selectedNav === "Settings" ? "active" : ""}>
              <Icon name="more" size={18} />
              More
            </span>
          </nav>
        )}
      </div>
    </div>
  );
}

function SignInScreen() {
  const [state, setState] = useState<"Default" | "Wrong password" | "Locked">("Default");
  const error =
    state === "Wrong password"
      ? "Wrong email or password."
      : state === "Locked"
        ? "Too many failed attempts. Wait about 15 minutes and try again."
        : "";
  return (
    <>
      <div className="screen-state-control">
        <Segmented
          options={["Default", "Wrong password", "Locked"] as const}
          value={state}
          onChange={setState}
          label="Sign-in state"
        />
      </div>
      <div className="sign-in-screen">
        <div className="sign-in-brand">
          <span>
            <Icon name="lock" />
          </span>
          <p className="eyebrow">Secure care access</p>
          <h1>Welcome back</h1>
          <p>Sign in to Mobility Aid Compliance.</p>
        </div>
        <form className="sign-in-card" onSubmit={(event) => event.preventDefault()}>
          {error && (
            <div className="form-error" role="alert">
              <Icon name="alert" size={18} />
              {error}
            </div>
          )}
          <Field label="Email" placeholder="name@carehome.org" />
          <Field label="Password" type="password" placeholder="Enter your password" />
          <Button size="large">Sign in</Button>
          <p className="privacy-caption">
            <Icon name="eyeOff" size={15} />
            No camera images are captured.
          </p>
        </form>
      </div>
    </>
  );
}

function PendingAlert({
  level,
  patient,
  code,
  room,
  aid,
  time,
  escalated,
  onAcknowledge,
}: {
  level: "Warning" | "Escalated";
  patient: string;
  code: string;
  room: string;
  aid: string;
  time: string;
  escalated?: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <article className={`pending-alert pending-${level.toLowerCase()}`}>
      <div className="alert-card-top">
        <AlertBadge level={level} />
        <time>{time} UTC</time>
      </div>
      <h3>{patient}</h3>
      <p className="patient-meta">
        {code} · Room {room}
      </p>
      <dl className="alert-facts">
        <div>
          <dt>Detected aid</dt>
          <dd>{aid}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>Acknowledge before 14:32, or it escalates</dd>
        </div>
      </dl>
      {escalated && (
        <p className="escalated-note">Escalated 14:32: nurse and family were notified</p>
      )}
      <Button onClick={onAcknowledge}>Acknowledge</Button>
    </article>
  );
}

function PatientSummary({
  name,
  code,
  room,
  status,
  prescribed,
  last,
  onOpen,
}: {
  name: string;
  code: string;
  room: string;
  status: Status;
  prescribed: string;
  last: string;
  onOpen: () => void;
}) {
  return (
    <article className="patient-summary">
      <div className="summary-heading">
        <div>
          <button onClick={onOpen}>{name}</button>
          <p>
            {code} · Room {room}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <dl>
        <div>
          <dt>Prescribed aid</dt>
          <dd>{prescribed}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{last}</dd>
        </div>
      </dl>
    </article>
  );
}

function DashboardScreen({
  openPatient,
  success = false,
}: {
  openPatient: () => void;
  success?: boolean;
}) {
  const [alerts, setAlerts] = useState(success ? [] : [1, 2]);
  return (
    <div className="dashboard-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Nurse dashboard</p>
          <h1>Good afternoon, Demo Nurse</h1>
          <p>Assigned patient status and alerts in real time.</p>
        </div>
        <LiveIndicator />
      </div>
      {success && (
        <div className="toast dashboard-success-toast">
          <span className="message-icon">
            <Icon name="check" />
          </span>
          <div>
            <strong>Warning acknowledged</strong>
            <p>The dashboard is up to date.</p>
          </div>
        </div>
      )}
      <div className="dashboard-grid">
        <section className="dashboard-section pending-section">
          <SectionHeader
            title="Pending alerts"
            action={<span className="count">{alerts.length}</span>}
          />
          {alerts.length ? (
            <div className="stack">
              {alerts.includes(1) && (
                <PendingAlert
                  level="Escalated"
                  patient="Demo Patient A"
                  code="P-0042"
                  room="R-204"
                  aid="None"
                  time="14:28"
                  escalated
                  onAcknowledge={() => setAlerts((items) => items.filter((id) => id !== 1))}
                />
              )}
              {alerts.includes(2) && (
                <PendingAlert
                  level="Warning"
                  patient="Demo Patient B"
                  code="P-0043"
                  room="R-205"
                  aid="None"
                  time="14:30"
                  onAcknowledge={() => setAlerts((items) => items.filter((id) => id !== 2))}
                />
              )}
            </div>
          ) : (
            <div className="empty-state compact">
              <span>
                <Icon name="check" />
              </span>
              <strong>All patients are fine right now.</strong>
            </div>
          )}
        </section>
        <section className="dashboard-section patients-section">
          <SectionHeader title="Patients" action={<span className="count">2</span>} />
          <div className="stack">
            <PatientSummary
              name="Demo Patient A"
              code="P-0042"
              room="R-204"
              status="Escalated"
              prescribed="Walker"
              last="No aid · 14:28 UTC"
              onOpen={openPatient}
            />
            <PatientSummary
              name="Demo Patient B"
              code="P-0043"
              room="R-205"
              status="Warning"
              prescribed="Cane"
              last="No aid · 14:30 UTC"
              onOpen={openPatient}
            />
          </div>
        </section>
        <section className="dashboard-section review-section">
          <SectionHeader
            title="Review queue"
            description="Low-confidence detections create no alert."
            action={<span className="count neutral">1</span>}
          />
          <article className="review-row">
            <span className="avatar">DB</span>
            <div>
              <strong>Room R-205 · Cane</strong>
              <p>Aid 62% · Identity 71%</p>
              <time>14:18 UTC</time>
            </div>
            <StatusBadge status="Needs review" />
          </article>
        </section>
      </div>
    </div>
  );
}

function AlertDetailScreen() {
  const [acknowledged, setAcknowledged] = useState(false);
  const timeline = [
    ["Detected", "No aid · Room R-204", "14:28"],
    ["Notified", "Demo Nurse", "14:28"],
    ["Escalated", "Nurse and family notified", "14:32"],
    [
      "Acknowledged",
      acknowledged ? "By Demo Nurse" : "Waiting for Demo Nurse",
      acknowledged ? "14:34" : "—",
    ],
    ["Closed", "Waiting for prescribed aid to be seen", "—"],
  ];
  return (
    <div className="detail-screen">
      <div className="product-page-heading">
        <div>
          <p className="back-link">‹ Pending alerts</p>
          <AlertBadge level="Escalated" />
          <h1>Mobility aid alert</h1>
          <p>Demo Patient A · P-0042 · Room R-204</p>
        </div>
        {!acknowledged && <Button onClick={() => setAcknowledged(true)}>Acknowledge</Button>}
      </div>
      <div className="detail-grid">
        <section className="detail-card">
          <SectionHeader title="Timeline" />
          <ol className="timeline">
            {timeline.map(([title, detail, time], index) => (
              <li
                key={title}
                className={
                  title === "Closed" || (title === "Acknowledged" && !acknowledged) ? "future" : ""
                }
              >
                <span>
                  {title === "Closed" ? (
                    <Icon name="clock" size={14} />
                  ) : (
                    <Icon name="check" size={14} />
                  )}
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
                <time>{time === "—" ? time : `${time} UTC`}</time>
              </li>
            ))}
          </ol>
        </section>
        <section className="detail-card">
          <SectionHeader title="Delivery status" />
          <div className="delivery-list">
            <div>
              <span>Demo Nurse</span>
              <StatusBadge status="Active" />
              <strong>Sent</strong>
            </div>
            <div>
              <span>Demo Nurse 2</span>
              <StatusBadge status="Inactive" />
              <strong>Queued</strong>
            </div>
            <div>
              <span>Demo Family</span>
              <StatusBadge status="Emergency" />
              <strong>Failed</strong>
            </div>
            <div>
              <span>Demo Family 2</span>
              <StatusBadge status="No data" />
              <strong>Skipped</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PatientScreen() {
  const [tab, setTab] = useState<"Alerts" | "Detections">("Alerts");
  return (
    <div className="patient-screen">
      <p className="back-link">‹ Patients</p>
      <div className="patient-hero">
        <div className="avatar large">DA</div>
        <div>
          <p className="eyebrow">Patient profile</p>
          <h1>Demo Patient A</h1>
          <p>P-0042 · Room R-204 · Prescribed walker</p>
        </div>
        <StatusBadge status="Escalated" />
      </div>
      <Segmented
        options={["Alerts", "Detections"] as const}
        value={tab}
        onChange={setTab}
        label="Patient activity"
      />
      {tab === "Alerts" ? (
        <div className="activity-table">
          <div className="activity-head">
            <span>Alert</span>
            <span>Location and aid</span>
            <span>Status</span>
            <span>Acknowledged</span>
          </div>
          <article>
            <div>
              <AlertBadge level="Escalated" />
              <time>14:28 UTC</time>
            </div>
            <p>R-204 · No aid</p>
            <StatusBadge status="Active" />
            <p>Demo Nurse · 14:34 UTC</p>
          </article>
          <article>
            <div>
              <AlertBadge level="Warning" />
              <time>Yesterday · 18:04 UTC</time>
            </div>
            <p>H-2 · Cane</p>
            <StatusBadge status="Inactive" />
            <p>Demo Nurse 2 · 18:06 UTC</p>
          </article>
        </div>
      ) : (
        <div className="activity-table detections-table">
          <div className="activity-head">
            <span>Aid and time</span>
            <span>Aid confidence</span>
            <span>Identity confidence</span>
            <span>Review</span>
          </div>
          <article>
            <p>
              <strong>Walker</strong>
              <small>14:35 UTC · R-204</small>
            </p>
            <p>96%</p>
            <p>98%</p>
            <StatusBadge status="OK" />
          </article>
          <article>
            <p>
              <strong>Cane</strong>
              <small>14:18 UTC · H-2</small>
            </p>
            <p>62%</p>
            <p>71%</p>
            <StatusBadge status="Needs review" />
          </article>
        </div>
      )}
    </div>
  );
}

function FamilyHomeScreen({ view }: { view: "Needs attention" | "Doing well" | "No alerts" }) {
  const needsAttention = view === "Needs attention";
  const noAlerts = view === "No alerts";
  return (
    <div className="family-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Family home</p>
          <h1>Hello, Demo Family</h1>
          <p>A simple update about your family member.</p>
        </div>
      </div>

      <article className={`family-status-card ${needsAttention ? "family-status-attention" : ""}`}>
        <div className="family-status-heading">
          <div className="avatar large">DA</div>
          <div>
            <h2>Demo Patient A</h2>
            <p>Room R-204</p>
          </div>
          {needsAttention ? <AlertBadge level="Warning" /> : <StatusBadge status="OK" />}
        </div>
        <div className="family-status-message">
          <span>
            <Icon name={needsAttention ? "alert" : "check"} size={22} />
          </span>
          <div>
            <strong>
              {needsAttention
                ? "Needs attention: not using the walker at 14:22"
                : "Using the walker as prescribed"}
            </strong>
            <p>
              {needsAttention
                ? "The care team has been notified."
                : "Everything looks as expected right now."}
            </p>
          </div>
        </div>
        <dl className="family-status-facts">
          <div>
            <dt>Last seen</dt>
            <dd>{needsAttention ? "14:22 UTC" : "14:36 UTC"}</dd>
          </div>
          <div>
            <dt>Prescribed aid</dt>
            <dd>Walker</dd>
          </div>
        </dl>
      </article>

      <section className="family-history-section">
        <SectionHeader
          title="Alert history"
          description="Important updates shared with you and the care team."
        />
        {noAlerts ? (
          <div className="empty-state family-empty">
            <span>
              <Icon name="check" />
            </span>
            <strong>No alerts so far.</strong>
            <p>Updates that need attention will appear here.</p>
          </div>
        ) : (
          <div className="family-alert-list">
            <article>
              <div className="family-alert-primary">
                <AlertBadge level="Escalated" />
                <time>Today · 14:32 UTC</time>
              </div>
              <div>
                <strong>Room R-204 · No aid</strong>
                <p>Demo Patient A was not using the walker.</p>
              </div>
              <StatusBadge status="Resolved" />
              <p className="family-acknowledged">
                <Icon name="check" size={15} />
                Acknowledged by a nurse
              </p>
            </article>
            <article>
              <div className="family-alert-primary">
                <AlertBadge level="Warning" />
                <time>Yesterday · 18:04 UTC</time>
              </div>
              <div>
                <strong>Hallway H-2 · Cane</strong>
                <p>Demo Patient A was using a cane instead of the walker.</p>
              </div>
              <StatusBadge status="Resolved" />
              <p className="family-acknowledged">
                <Icon name="check" size={15} />
                Acknowledged by a nurse
              </p>
            </article>
          </div>
        )}
      </section>

      <aside className="family-help-panel">
        <div className="family-help-title">
          <span>
            <Icon name="info" />
          </span>
          <div>
            <h2>What do these alerts mean?</h2>
            <p>These words show how quickly the care team needs to respond.</p>
          </div>
        </div>
        <div className="family-help-levels">
          <div>
            <AlertBadge level="Warning" />
            <p>The prescribed aid was not being used, so a nurse was told.</p>
          </div>
          <div>
            <AlertBadge level="Escalated" />
            <p>A nurse did not respond in time, so family was also told.</p>
          </div>
          <div>
            <AlertBadge level="Emergency" />
            <p>A possible fall was reported, so a nurse and family were told.</p>
          </div>
        </div>
        <footer>
          <Icon name="eyeOff" size={16} />
          No camera images are captured.
        </footer>
      </aside>
    </div>
  );
}

type AdminDetailTab =
  | "Details"
  | "Prescribed aid"
  | "Caregivers"
  | "ReID enrolment"
  | "Danger zone";

const adminPatients = [
  {
    name: "Demo Patient A",
    code: "P-0042",
    room: "R-204",
    aid: "Walker",
    caregivers: 3,
    status: "Active" as Status,
  },
  {
    name: "Demo Patient B",
    code: "P-0043",
    room: "R-205",
    aid: "Cane",
    caregivers: 2,
    status: "Active" as Status,
  },
  {
    name: "Demo Patient C",
    code: "P-0037",
    room: "—",
    aid: "Wheelchair",
    caregivers: 2,
    status: "Discharged" as Status,
  },
];

function AdminPatientsScreen({ onAdd, onOpen }: { onAdd: () => void; onOpen: () => void }) {
  const [filter, setFilter] = useState<"Active" | "Discharged" | "All">("Active");
  const [search, setSearch] = useState("");
  const shownPatients = adminPatients.filter(
    (patient) =>
      (filter === "All" || patient.status === filter) &&
      `${patient.name} ${patient.code} ${patient.room}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="admin-patients-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Patients</h1>
          <p>Manage enrolled patients, prescriptions, caregivers, and consent.</p>
        </div>
        <Button onClick={onAdd}>Add patient</Button>
      </div>
      <div className="admin-list-tools">
        <label className="admin-search">
          <Icon name="patients" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, code, or room"
            aria-label="Search patients"
          />
        </label>
        <Segmented
          options={["Active", "Discharged", "All"] as const}
          value={filter}
          onChange={setFilter}
          label="Patient status filter"
        />
      </div>
      {shownPatients.length ? (
        <>
          <div className="admin-patient-table">
            <div className="admin-patient-head">
              <span>Name</span>
              <span>Code</span>
              <span>Room</span>
              <span>Prescribed aid</span>
              <span>Caregivers</span>
              <span>Status</span>
              <span />
            </div>
            {shownPatients.map((patient) => (
              <article key={patient.code}>
                <button onClick={onOpen}>{patient.name}</button>
                <p data-label="Code">{patient.code}</p>
                <p data-label="Room">{patient.room}</p>
                <p data-label="Prescribed aid">{patient.aid}</p>
                <p data-label="Caregivers">{patient.caregivers}</p>
                <div data-label="Status">
                  <StatusBadge status={patient.status} />
                </div>
                <button className="row-arrow" onClick={onOpen} aria-label={`Open ${patient.name}`}>
                  <Icon name="arrow" size={17} />
                </button>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <span>
            <Icon name="patients" />
          </span>
          <strong>No patients found</strong>
          <p>Try a different search or status filter.</p>
        </div>
      )}
    </div>
  );
}

function AddPatientScreen({ onBack }: { onBack: () => void }) {
  const [roomMode, setRoomMode] = useState<"Existing room" | "New room">("Existing room");
  const [saved, setSaved] = useState(false);
  return (
    <div className="admin-form-screen">
      <button className="back-link" onClick={onBack}>
        ‹ Patients
      </button>
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">New enrolment</p>
          <h1>Add patient</h1>
          <p>Record identity, care details, and consent before monitoring begins.</p>
        </div>
      </div>
      {saved && (
        <div className="inline-message admin-saved-message">
          <Icon name="check" />
          <p>
            <strong>Patient ready to add.</strong> All required consent information is recorded.
          </p>
        </div>
      )}
      <form
        className="admin-form-card"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <SectionHeader
          title="Patient details"
          description="Full names are visible only to signed-in care staff and admins."
        />
        <div className="admin-form-grid">
          <label className="field">
            <span>Patient code</span>
            <input required placeholder="P-0044" />
            <small>Cannot be changed later. Used in detection events and the ReID gallery.</small>
          </label>
          <Field label="Full name" placeholder="Enter full name" required />
          <Field
            label="Initials (optional)"
            hint="Derived from the name if left blank."
            placeholder="DP"
          />
          <label className="field">
            <span>Age (optional)</span>
            <input type="number" min="0" placeholder="Enter age" />
          </label>
        </div>
        <div className="admin-form-divider">
          <SectionHeader title="Room and prescribed aid" />
          <div className="admin-room-choice">
            <Segmented
              options={["Existing room", "New room"] as const}
              value={roomMode}
              onChange={setRoomMode}
              label="Room type"
            />
            {roomMode === "Existing room" ? (
              <Field
                label="Room"
                type="select"
                hint="Select an available room."
                options={["R-204", "R-205", "H-2"]}
                required
              />
            ) : (
              <Field label="New room" placeholder="For example, R-206" />
            )}
            <label className="field">
              <span>Prescribed aid</span>
              <select defaultValue="walker" required>
                <option value="none">None</option>
                <option value="cane">Cane</option>
                <option value="crutches">Crutches</option>
                <option value="walker">Walker</option>
                <option value="wheelchair">Wheelchair</option>
              </select>
            </label>
          </div>
        </div>
        <fieldset className="consent-panel">
          <legend>Required consent</legend>
          <p>Consent for monitoring and identification recorded from:</p>
          <label>
            <input type="radio" name="consent-source" required />
            Patient
          </label>
          <label>
            <input type="radio" name="consent-source" required />
            Substitute decision-maker
          </label>
          <label className="field consent-date">
            <span>Date recorded</span>
            <input type="date" required defaultValue="2026-11-10" />
          </label>
          <small>
            Required before monitoring, identification, or calibration samples can be recorded.
          </small>
        </fieldset>
        <div className="form-actions">
          <Button variant="secondary" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit">Add patient</Button>
        </div>
      </form>
    </div>
  );
}

function AdminConfirm({
  title,
  description,
  confirmLabel,
  danger = true,
  children,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="admin-dialog-backdrop">
      <div className="confirm-dialog admin-confirm-dialog" role="dialog" aria-modal="true">
        <span className={danger ? "danger-icon" : "confirm-icon"}>
          <Icon name={danger ? "alert" : "info"} />
        </span>
        <h3>{title}</h3>
        <p>{description}</p>
        {children}
        <div>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminPatientDetailScreen({ initialTab = "Details" }: { initialTab?: AdminDetailTab }) {
  const [tab, setTab] = useState<AdminDetailTab>(initialTab);
  const [dialog, setDialog] = useState<"delete" | "discharge" | "reactivate" | null>(null);
  const [discharged, setDischarged] = useState(false);
  const [deleteOnDischarge, setDeleteOnDischarge] = useState(false);
  const [samples, setSamples] = useState([
    ["Walker", "No", "2026-11-10"],
    ["Walker", "Yes", "2026-11-10"],
    ["No aid", "No", "2026-11-08"],
  ]);
  const tabs: AdminDetailTab[] = [
    "Details",
    "Prescribed aid",
    "Caregivers",
    "ReID enrolment",
    "Danger zone",
  ];
  return (
    <div className="admin-detail-screen">
      <p className="back-link">‹ Patients</p>
      <div className="patient-hero admin-patient-hero">
        <div className="avatar large">DA</div>
        <div>
          <p className="eyebrow">Patient record</p>
          <h1>Demo Patient A</h1>
          <p>P-0042 · Room R-204 · Walker prescribed</p>
        </div>
        <StatusBadge status={discharged ? "Discharged" : "Active"} />
      </div>
      <div className="admin-detail-layout">
        <nav className="admin-detail-nav" aria-label="Patient sections">
          {tabs.map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
              <Icon name="arrow" size={15} />
            </button>
          ))}
        </nav>
        <section className="admin-detail-panel">
          {tab === "Details" && (
            <>
              <SectionHeader title="Details" description="Patient code P-0042 cannot be changed." />
              <div className="admin-form-grid">
                <Field label="Full name" placeholder="Demo Patient A" />
                <Field label="Initials (optional)" placeholder="DA" />
                <Field label="Age (optional)" placeholder="79" />
                <Field
                  label="Room"
                  type="select"
                  hint="Current room: R-204"
                  options={["R-204", "R-205", "H-2"]}
                />
              </div>
              <div className="form-actions">
                <Button>Save changes</Button>
              </div>
            </>
          )}
          {tab === "Prescribed aid" && (
            <>
              <SectionHeader
                title="Prescribed aid"
                description="Alerts compare the detected aid with the current prescription."
                action={<Button>Change prescription</Button>}
              />
              <div className="current-prescription">
                <span>Current</span>
                <strong>Walker</strong>
                <small>Since 2026-09-14</small>
              </div>
              <h3 className="subsection-title">Prescription history</h3>
              <div className="history-list">
                <div>
                  <strong>Walker</strong>
                  <span>2026-09-14 · Current</span>
                </div>
                <div>
                  <strong>Cane</strong>
                  <span>2026-04-02 to 2026-09-13</span>
                </div>
                <div>
                  <strong>None</strong>
                  <span>Until 2026-04-01</span>
                </div>
              </div>
            </>
          )}
          {tab === "Caregivers" && (
            <>
              <SectionHeader
                title="Caregivers"
                description="Choose who is assigned to this patient."
              />
              <div className="caregiver-columns">
                <fieldset>
                  <legend>Nurses</legend>
                  <label>
                    <input type="checkbox" defaultChecked /> Demo Nurse
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked /> Demo Nurse 2
                  </label>
                </fieldset>
                <fieldset>
                  <legend>Family members</legend>
                  <label>
                    <input type="checkbox" defaultChecked /> Demo Family
                  </label>
                  <label>
                    <input type="checkbox" /> Demo Family 2
                  </label>
                </fieldset>
              </div>
              <div className="form-actions">
                <Button>Save caregivers</Button>
              </div>
            </>
          )}
          {tab === "ReID enrolment" && (
            <>
              <SectionHeader
                title="ReID enrolment"
                description={`${samples.length} calibration samples, last added 2026-11-10`}
              />
              <div className="biometric-note">
                <Icon name="lock" size={18} />
                <p>
                  <strong>Embeddings are biometric data.</strong> They are visible to admins only.
                </p>
              </div>
              <div className="sample-upload">
                <div>
                  <h3>Upload calibration samples</h3>
                  <p>Choose the patient’s aid state when each sample was recorded.</p>
                </div>
                <label className="field">
                  <span>Current aid state</span>
                  <select defaultValue="walker">
                    <option value="none">None</option>
                    <option value="cane">Cane</option>
                    <option value="crutches">Crutches</option>
                    <option value="walker">Walker</option>
                    <option value="wheelchair">Wheelchair</option>
                  </select>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" />
                  <span>
                    <strong>Recorded with a helper (assisted walking)</strong>
                  </span>
                </label>
                <label className="file-upload">
                  <input type="file" multiple />
                  <Icon name="review" />
                  <strong>Choose calibration samples</strong>
                  <span>No camera images are shown in alerts or notifications.</span>
                </label>
                <Button
                  onClick={() => setSamples((items) => [["Walker", "No", "2026-11-10"], ...items])}
                >
                  Add samples
                </Button>
              </div>
              <h3 className="subsection-title">Calibration samples</h3>
              {samples.length ? (
                <div className="sample-list">
                  <div className="sample-head">
                    <span>Sample</span>
                    <span>Aid state</span>
                    <span>Assisted</span>
                    <span>Date added</span>
                  </div>
                  {samples.map(([aid, assisted, date], index) => (
                    <article key={`${aid}-${date}-${index}`}>
                      <strong>Sample {String(index + 1).padStart(2, "0")}</strong>
                      <span data-label="Aid state">{aid}</span>
                      <span data-label="Assisted">{assisted}</span>
                      <span data-label="Date added">{date}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <span>
                    <Icon name="review" />
                  </span>
                  <strong>No calibration samples</strong>
                </div>
              )}
              <div className="sensitive-action">
                <div>
                  <strong>Delete all embeddings</strong>
                  <p>Removes all ReID calibration data for this patient.</p>
                </div>
                <Button variant="danger" onClick={() => setDialog("delete")}>
                  Delete all embeddings
                </Button>
              </div>
            </>
          )}
          {tab === "Danger zone" && (
            <>
              <SectionHeader
                title="Danger zone"
                description="These changes affect monitoring and alert delivery."
              />
              <div className="danger-actions">
                <article>
                  <div>
                    <h3>Discharge patient</h3>
                    <p>
                      Keeps the patient’s history, stops monitoring alerts, and offers to delete
                      ReID embeddings.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    disabled={discharged}
                    onClick={() => setDialog("discharge")}
                  >
                    Discharge patient
                  </Button>
                </article>
                <article>
                  <div>
                    <h3>Reactivate patient</h3>
                    <p>Restarts monitoring and alerts using the current patient settings.</p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!discharged}
                    onClick={() => setDialog("reactivate")}
                  >
                    Reactivate
                  </Button>
                </article>
              </div>
            </>
          )}
        </section>
      </div>
      {dialog === "delete" && (
        <AdminConfirm
          title="Delete all embeddings?"
          description="This permanently deletes every ReID embedding and calibration sample for Demo Patient A. Identification will stop until new samples are enrolled. Patient history and alerts are not deleted."
          confirmLabel="Delete all embeddings"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setSamples([]);
            setDialog(null);
          }}
        />
      )}
      {dialog === "discharge" && (
        <AdminConfirm
          title="Discharge Demo Patient A?"
          description="The patient’s history will be kept, monitoring and new alerts will stop, and assigned caregivers will retain access to past alerts."
          confirmLabel="Discharge patient"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            if (deleteOnDischarge) setSamples([]);
            setDischarged(true);
            setDialog(null);
          }}
        >
          <label className="dialog-checkbox">
            <input
              type="checkbox"
              checked={deleteOnDischarge}
              onChange={(event) => setDeleteOnDischarge(event.target.checked)}
            />{" "}
            Also permanently delete all ReID embeddings
          </label>
        </AdminConfirm>
      )}
      {dialog === "reactivate" && (
        <AdminConfirm
          title="Reactivate Demo Patient A?"
          description="Monitoring and alerts will restart immediately using the current room, prescribed aid, caregiver assignments, and any retained ReID embeddings."
          confirmLabel="Reactivate patient"
          danger={false}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDischarged(false);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

const adminUsers = [
  {
    name: "Demo Nurse",
    email: "nurse@example.test",
    role: "Nurse",
    active: true,
    patients: 2,
  },
  {
    name: "Demo Nurse 2",
    email: "nurse2@example.test",
    role: "Nurse",
    active: true,
    patients: 1,
  },
  {
    name: "Demo Family",
    email: "family@example.test",
    role: "Family",
    active: true,
    patients: 1,
  },
  {
    name: "Demo Family 2",
    email: "family2@example.test",
    role: "Family",
    active: false,
    patients: 1,
  },
  {
    name: "Demo Admin",
    email: "admin@example.test",
    role: "Admin",
    active: true,
    patients: 2,
  },
];

function AdminUsersScreen({
  onAdd,
  onOpen,
}: {
  onAdd: () => void;
  onOpen: (self: boolean) => void;
}) {
  return (
    <div className="admin-users-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Users</h1>
          <p>Manage access for nurses, family members, and admins.</p>
        </div>
        <Button onClick={onAdd}>Add user</Button>
      </div>
      <div className="admin-user-table">
        <div className="admin-user-head">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Patients</span>
          <span>Status</span>
          <span />
        </div>
        {adminUsers.map((user) => (
          <article key={user.email}>
            <button onClick={() => onOpen(user.role === "Admin")}>{user.name}</button>
            <p data-label="Email">{user.email}</p>
            <p data-label="Role">{user.role}</p>
            <p data-label="Patients">{user.patients}</p>
            <div data-label="Status">
              <StatusBadge status={user.active ? "Active" : "Inactive"} />
            </div>
            <button
              className="row-arrow"
              onClick={() => onOpen(user.role === "Admin")}
              aria-label={`Open ${user.name}`}
            >
              <Icon name="arrow" size={17} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  hint,
  error,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className={`field password-field ${error ? "field-error" : ""}`}>
      <span>{label}</span>
      <div>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={minLength}
          required
        />
        <button type="button" onClick={() => setVisible((current) => !current)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {(hint || error) && <small>{error || hint}</small>}
    </label>
  );
}

function AddUserScreen({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const passwordError = submitted && password.length < 10;
  return (
    <div className="admin-form-screen">
      <button className="back-link" onClick={onBack}>
        ‹ Users
      </button>
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Access management</p>
          <h1>Add user</h1>
          <p>Create sign-in access and assign a permanent role.</p>
        </div>
      </div>
      <form
        className="admin-form-card compact-admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="admin-form-grid">
          <Field label="Name" placeholder="Enter full name" required />
          <label className="field">
            <span>Email</span>
            <input type="email" required placeholder="name@example.test" />
            <small>Cannot be changed later. Used to sign in.</small>
          </label>
          <label className="field">
            <span>Role</span>
            <select defaultValue="" required>
              <option value="" disabled>
                Select a role
              </option>
              <option value="nurse">Nurse</option>
              <option value="family">Family</option>
              <option value="admin">Admin</option>
            </select>
            <small>Cannot be changed later.</small>
          </label>
          <PasswordInput
            label="Starting password"
            value={password}
            onChange={setPassword}
            minLength={10}
            hint="At least 10 characters."
            error={passwordError ? "Use at least 10 characters." : undefined}
          />
        </div>
        {submitted && !passwordError && (
          <div className="inline-message">
            <Icon name="check" />
            <p>
              <strong>User ready to add.</strong> The starting password meets the requirements.
            </p>
          </div>
        )}
        <div className="form-actions">
          <Button variant="secondary" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit">Add user</Button>
        </div>
      </form>
    </div>
  );
}

function AdminUserDetailScreen({ self }: { self: boolean }) {
  const [active, setActive] = useState(true);
  const [dialog, setDialog] = useState<"deactivate" | "reactivate" | null>(null);
  const [reset, setReset] = useState(false);
  const name = self ? "Demo Admin" : "Demo Nurse";
  return (
    <div className="admin-user-detail">
      <p className="back-link">‹ Users</p>
      <div className="patient-hero admin-patient-hero">
        <div className="avatar large">{self ? "DA" : "DN"}</div>
        <div>
          <p className="eyebrow">{self ? "Your admin account" : "User account"}</p>
          <h1>{name}</h1>
          <p>{self ? "admin@example.test · Admin" : "nurse@example.test · Nurse"}</p>
        </div>
        <StatusBadge status={active ? "Active" : "Inactive"} />
      </div>
      <div className="admin-detail-panel">
        <SectionHeader title="Profile" description="Email and role cannot be changed." />
        <div className="admin-form-grid">
          <Field label="Name" placeholder={name} />
          <div className="read-only-field">
            <span>Email</span>
            <strong>{self ? "admin@example.test" : "nurse@example.test"}</strong>
          </div>
          <div className="read-only-field">
            <span>Role</span>
            <strong>{self ? "Admin" : "Nurse"}</strong>
          </div>
        </div>
        <div className="form-actions">
          <Button>Save name</Button>
        </div>
      </div>
      <div className="admin-detail-panel user-security-panel">
        <SectionHeader title="Security and access" />
        {reset && (
          <div className="inline-message">
            <Icon name="check" />
            <p>
              <strong>Password reset.</strong> The user must use the new starting password.
            </p>
          </div>
        )}
        <div className="user-action-row">
          <div>
            <h3>Reset password</h3>
            <p>Replaces the current password with a new temporary starting password.</p>
          </div>
          <Button variant="secondary" onClick={() => setReset(true)}>
            Reset password
          </Button>
        </div>
        <div className="user-action-row">
          <div>
            <h3>{active ? "Deactivate user" : "Reactivate user"}</h3>
            <p>
              {self
                ? "You cannot deactivate the admin account you are currently signed in with."
                : active
                  ? "They can no longer sign in and receive no notifications. History is kept."
                  : "They can sign in and receive notifications again."}
            </p>
          </div>
          <Button
            variant={active ? "danger" : "secondary"}
            disabled={self}
            onClick={() => setDialog(active ? "deactivate" : "reactivate")}
          >
            {active ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </div>
      {dialog === "deactivate" && (
        <AdminConfirm
          title={`Deactivate ${name}?`}
          description="They can no longer sign in and receive no notifications. History is kept."
          confirmLabel="Deactivate user"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setActive(false);
            setDialog(null);
          }}
        />
      )}
      {dialog === "reactivate" && (
        <AdminConfirm
          title={`Reactivate ${name}?`}
          description="They can sign in again and will receive notifications for assigned patients."
          confirmLabel="Reactivate user"
          danger={false}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setActive(true);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function AdminRoomsScreen() {
  const [rooms, setRooms] = useState([
    { id: "R-204", type: "Room" },
    { id: "R-205", type: "Room" },
    { id: "H-2", type: "Hallway" },
  ]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [roomId, setRoomId] = useState("");
  const [roomType, setRoomType] = useState<"Room" | "Hallway">("Room");
  const openEditor = (id: string | "new") => {
    const current = rooms.find((room) => room.id === id);
    setEditing(id);
    setRoomId(current?.id ?? "");
    setRoomType((current?.type as "Room" | "Hallway") ?? "Room");
  };
  const saveRoom = () => {
    if (!roomId.trim()) return;
    setRooms((items) =>
      editing === "new"
        ? [...items, { id: roomId.toUpperCase(), type: roomType }]
        : items.map((item) =>
            item.id === editing ? { id: roomId.toUpperCase(), type: roomType } : item,
          ),
    );
    setEditing(null);
  };
  return (
    <div className="admin-rooms-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Rooms and zones</h1>
          <p>Room IDs are recorded in detection events and alerts.</p>
        </div>
        <Button onClick={() => openEditor("new")}>Add room or zone</Button>
      </div>
      <div className="rooms-table">
        <div className="rooms-head">
          <span>Room ID</span>
          <span>Type</span>
          <span />
        </div>
        {rooms.map((room) => (
          <article key={room.id}>
            <strong>{room.id}</strong>
            <p data-label="Type">{room.type}</p>
            <Button variant="secondary" onClick={() => openEditor(room.id)}>
              Edit
            </Button>
          </article>
        ))}
      </div>
      {editing && (
        <div className="room-editor">
          <SectionHeader
            title={editing === "new" ? "Add room or zone" : `Edit ${editing}`}
            description="Use the same ID sent by the LiDAR detection system."
          />
          <div className="admin-form-grid">
            <label className="field">
              <span>Room ID</span>
              <input
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                placeholder="For example, R-204 or H-2"
              />
            </label>
            <label className="field">
              <span>Type</span>
              <select
                value={roomType}
                onChange={(event) => setRoomType(event.target.value as "Room" | "Hallway")}
              >
                <option>Room</option>
                <option>Hallway</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveRoom}>{editing === "new" ? "Add" : "Save changes"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSettingsScreen() {
  const defaults = { identity: "0.80", aid: "0.80", cooldown: "10", timeout: "5" };
  const [values, setValues] = useState(defaults);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const update = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSaved(false);
  };
  return (
    <div className="admin-settings-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Settings</h1>
          <p>Changes apply immediately without redeploying the website.</p>
        </div>
        {dirty ? (
          <span className="unsaved-indicator">
            <span />
            Unsaved changes
          </span>
        ) : saved ? (
          <span className="saved-indicator">
            <Icon name="check" size={15} />
            Saved
          </span>
        ) : null}
      </div>
      <section className="settings-card">
        <SectionHeader
          title="Detection thresholds"
          description="Detections below either threshold go to manual review and create no alert."
        />
        <div className="settings-grid">
          <label className="field">
            <span>Identity confidence threshold</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={values.identity}
              onChange={(event) => update("identity", event.target.value)}
            />
            <small>Default 0.80</small>
          </label>
          <label className="field">
            <span>Aid confidence threshold</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={values.aid}
              onChange={(event) => update("aid", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Repeat-alert cooldown in minutes</span>
            <input
              type="number"
              min="0"
              value={values.cooldown}
              onChange={(event) => update("cooldown", event.target.value)}
            />
            <small>Default 10 minutes</small>
          </label>
          <label className="field">
            <span>Acknowledgement timeout in minutes</span>
            <input
              type="number"
              min="1"
              value={values.timeout}
              onChange={(event) => update("timeout", event.target.value)}
            />
            <small>Warnings escalate after this time.</small>
          </label>
        </div>
      </section>
      <section className="settings-card">
        <SectionHeader title="Alert routing" description="Who receives each alert level." />
        <div className="routing-table">
          <div className="routing-head">
            <span>Level</span>
            <span>Assigned nurse</span>
            <span>Family</span>
          </div>
          {[
            ["Info", false, false],
            ["Warning", true, false],
            ["Escalated", true, true],
            ["Emergency", true, true],
          ].map(([level, nurse, family]) => (
            <div className="routing-row" key={String(level)}>
              <AlertBadge level={level as AlertLevel} />
              <span className={nurse ? "route-yes" : "route-no"}>
                <Icon name={nurse ? "check" : "close"} size={15} />
                {nurse ? "Notified" : "Nobody"}
              </span>
              <span className={family ? "route-yes" : "route-no"}>
                <Icon name={family ? "check" : "close"} size={15} />
                {family ? "Notified" : "Nobody"}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="settings-card">
        <SectionHeader title="Notification channel" />
        <div className="channel-list">
          <div>
            <span className="channel-icon">
              <Icon name="check" />
            </span>
            <div>
              <strong>Pushover</strong>
              <p>Available now</p>
            </div>
            <StatusBadge status="Active" />
          </div>
          <div>
            <span className="channel-icon planned">
              <Icon name="clock" />
            </span>
            <div>
              <strong>Web Push</strong>
              <p>Planned</p>
            </div>
            <StatusBadge status="Inactive" />
          </div>
        </div>
      </section>
      <div className="settings-actions">
        <Button
          variant="secondary"
          onClick={() => {
            setValues(defaults);
            setDirty(true);
            setSaved(false);
          }}
        >
          Reset to defaults
        </Button>
        <Button
          disabled={!dirty}
          onClick={() => {
            setDirty(false);
            setSaved(true);
          }}
        >
          Save settings
        </Button>
      </div>
    </div>
  );
}

function AccountScreen({
  role,
  passwordState,
}: {
  role: "Nurse" | "Family" | "Admin";
  passwordState: "Default" | "Wrong password" | "Locked";
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [pushKey, setPushKey] = useState("");
  const [pushState, setPushState] = useState<"Not saved" | "Saved" | "Removed">("Not saved");
  const error =
    passwordState === "Wrong password"
      ? "Wrong current password."
      : passwordState === "Locked"
        ? "Too many wrong attempts, wait a few minutes."
        : "";
  return (
    <div className="account-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">{role} account</p>
          <h1>Account</h1>
          <p>Manage your password{role !== "Admin" ? " and notification connection" : ""}.</p>
        </div>
      </div>
      <section className="account-card">
        <SectionHeader title="Change password" />
        {error && (
          <div className="form-error">
            <Icon name="alert" size={18} />
            {error}
          </div>
        )}
        <div className="account-password-fields">
          <PasswordInput
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} />
          <PasswordInput
            label="Repeat new password"
            value={repeatPassword}
            onChange={setRepeatPassword}
            error={
              repeatPassword && newPassword !== repeatPassword
                ? "Passwords do not match."
                : undefined
            }
          />
        </div>
        <div className="form-actions">
          <Button>Change password</Button>
        </div>
      </section>
      {role !== "Admin" && (
        <section className="account-card">
          <SectionHeader
            title="Pushover notifications"
            description="Connect Pushover to receive alerts on your device."
            action={
              pushState === "Saved" ? (
                <StatusBadge status="Active" />
              ) : pushState === "Removed" ? (
                <StatusBadge status="Inactive" />
              ) : null
            }
          />
          <div className="pushover-privacy">
            <Icon name="eyeOff" size={18} />
            <p>
              Notifications include only room, aid status, time, and patient initials or ID. No
              camera images are captured.
            </p>
          </div>
          {pushState === "Removed" && (
            <div className="inline-message">
              <Icon name="info" />
              <p>
                <strong>Pushover key removed.</strong> Notifications will no longer be sent here.
              </p>
            </div>
          )}
          <label className="field pushover-key">
            <span>30-character Pushover user key</span>
            <input
              value={pushKey}
              onChange={(event) => {
                setPushKey(event.target.value.slice(0, 30));
                setPushState("Not saved");
              }}
              minLength={30}
              maxLength={30}
              placeholder="Enter your Pushover key"
            />
            <small>{pushKey.length}/30 characters</small>
          </label>
          <div className="form-actions pushover-actions">
            {pushState === "Saved" && (
              <Button
                variant="danger"
                onClick={() => {
                  setPushKey("");
                  setPushState("Removed");
                }}
              >
                Remove key
              </Button>
            )}
            <Button disabled={pushKey.length !== 30} onClick={() => setPushState("Saved")}>
              Save key
            </Button>
          </div>
          {pushState === "Saved" && (
            <p className="saved-key-note">
              <Icon name="check" size={15} />
              Pushover key saved.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function NotificationPreviewsScreen() {
  const notifications: {
    level: "Warning" | "Escalated" | "Emergency";
    time: string;
  }[] = [
    { level: "Warning", time: "14:22" },
    { level: "Escalated", time: "14:27" },
    { level: "Emergency", time: "14:31" },
  ];
  return (
    <div className="notification-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Privacy-safe examples</p>
          <h1>Notification previews</h1>
          <p>No full names or images appear outside the signed-in site.</p>
        </div>
      </div>
      <SectionHeader
        title="Phone lock screen"
        description="Warning, Escalated, and Emergency always include an icon and word."
      />
      <div className="phone-preview-grid">
        {notifications.map(({ level, time }) => (
          <article className="phone-preview" key={level}>
            <div className="phone-status">
              <span>{time}</span>
              <span>•••</span>
            </div>
            <div className="phone-clock">
              <strong>{time}</strong>
              <span>Tuesday, November 10</span>
            </div>
            <div className="lock-notification">
              <span className={`notification-app-icon badge-${level.toLowerCase()}`}>
                <Icon name={alertIcons[level]} size={16} />
              </span>
              <div>
                <small>Mobility Aid Compliance · now</small>
                <strong>{level}: A.A. (P-0042)</strong>
                <p>Room R-204 · aid detected: none · {time} UTC</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="notification-format-grid">
        <article className="format-card">
          <span className="preview-chip">Desktop Web Push</span>
          <div className="web-push-toast">
            <span className="notification-app-icon badge-warning">
              <Icon name="alert" size={16} />
            </span>
            <div>
              <strong>Warning: A.A. (P-0042)</strong>
              <p>Room R-204 · aid detected: none · 14:22 UTC</p>
              <small>Mobility Aid Compliance</small>
            </div>
          </div>
        </article>
        <article className="format-card">
          <span className="preview-chip">SMS</span>
          <div className="sms-bubble">
            <p>Warning: A.A. (P-0042). Room R-204 · aid detected: none · 14:22 UTC.</p>
          </div>
        </article>
        <article className="format-card email-format">
          <span className="preview-chip">Email</span>
          <div className="notification-email">
            <small>Subject</small>
            <strong>Warning: A.A. (P-0042)</strong>
            <p>Room R-204 · aid detected: none · 14:22 UTC</p>
            <span>No camera images are captured.</span>
          </div>
        </article>
      </div>
    </div>
  );
}

function GlobalStatesScreen() {
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="global-states-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">System feedback</p>
          <h1>Global states</h1>
          <p>Consistent feedback for loading, interruptions, and unavailable content.</p>
        </div>
      </div>
      <div className="paused-banner">
        <LiveIndicator paused />
        <div>
          <strong>Live updates paused</strong>
          <p>Check your connection. Information on this page may be out of date.</p>
        </div>
        <Button variant="secondary">Reconnect</Button>
      </div>
      <div className="global-state-grid">
        <article className="state-card">
          <span className="preview-chip">Page loading</span>
          <div className="skeleton-card">
            <i />
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
        </article>
        <article className="state-card">
          <span className="preview-chip">Empty list</span>
          <div className="empty-state">
            <span>
              <Icon name="check" />
            </span>
            <strong>No items to show.</strong>
            <p>New items will appear here.</p>
          </div>
        </article>
        <article className="state-card">
          <span className="preview-chip">Error</span>
          <div className="state-message error-state">
            <span>
              <Icon name="alert" />
            </span>
            <strong>{retrying ? "Trying again…" : "Something went wrong"}</strong>
            <p>We couldn’t load this page.</p>
            <Button
              variant="secondary"
              loading={retrying}
              onClick={() => {
                setRetrying(true);
                window.setTimeout(() => setRetrying(false), 800);
              }}
            >
              Retry
            </Button>
          </div>
        </article>
        <article className="state-card">
          <span className="preview-chip">Session expired</span>
          <div className="state-message">
            <span>
              <Icon name="lock" />
            </span>
            <strong>Your session expired</strong>
            <p>Sign in again to continue securely.</p>
            <Button>Sign in</Button>
          </div>
        </article>
        <article className="state-card">
          <span className="preview-chip">403</span>
          <div className="state-message">
            <strong className="state-code">403</strong>
            <h2>You don’t have access to this patient</h2>
            <p>Return to the patients assigned to you.</p>
            <Button variant="secondary">Go back</Button>
          </div>
        </article>
        <article className="state-card">
          <span className="preview-chip">404</span>
          <div className="state-message">
            <strong className="state-code">404</strong>
            <h2>Not found</h2>
            <p>The page may have moved or no longer exists.</p>
            <Button variant="secondary">Go to dashboard</Button>
          </div>
        </article>
      </div>
    </div>
  );
}

type FlowTarget = {
  screen: Screen;
  dashboardSuccess?: boolean;
  adminTab?: AdminDetailTab;
};

function PrototypeFlowsScreen({ openScreen }: { openScreen: (target: FlowTarget) => void }) {
  const flows: {
    title: string;
    description: string;
    steps: ({ label: string } & FlowTarget)[];
  }[] = [
    {
      title: "Nurse acknowledges a Warning",
      description: "Open the notification, review the alert, acknowledge it, then see success.",
      steps: [
        { label: "Warning notification", screen: "Notification previews" },
        { label: "Alert detail", screen: "Alert detail" },
        { label: "Acknowledge", screen: "Alert detail" },
        { label: "Dashboard success", screen: "Nurse dashboard", dashboardSuccess: true },
      ],
    },
    {
      title: "Warning escalates",
      description: "The deadline passes, nurse and family are notified, and family sees the alert.",
      steps: [
        { label: "Warning dashboard", screen: "Nurse dashboard" },
        { label: "Escalated dashboard", screen: "Nurse dashboard" },
        { label: "Family home", screen: "Family home" },
      ],
    },
    {
      title: "Admin enrols a patient",
      description: "Add the patient, enrol ReID calibration samples, then assign a nurse.",
      steps: [
        { label: "Add patient", screen: "Add patient" },
        {
          label: "ReID enrolment",
          screen: "Admin patient detail",
          adminTab: "ReID enrolment",
        },
        {
          label: "Assign nurse",
          screen: "Admin patient detail",
          adminTab: "Caregivers",
        },
      ],
    },
    {
      title: "Family checks status",
      description: "Open the read-only family home and review the latest status and alert.",
      steps: [{ label: "Family home", screen: "Family home" }],
    },
  ];
  return (
    <div className="prototype-flow-screen">
      <div className="product-page-heading">
        <div>
          <p className="eyebrow">Clickable frame map</p>
          <h1>Prototype flows</h1>
          <p>Each step opens an existing Core screen.</p>
        </div>
      </div>
      <div className="flow-list">
        {flows.map((flow, flowIndex) => (
          <article key={flow.title}>
            <div className="flow-number">{flowIndex + 1}</div>
            <div className="flow-copy">
              <h2>{flow.title}</h2>
              <p>{flow.description}</p>
              <div className="flow-steps">
                {flow.steps.map((step, index) => (
                  <div key={`${step.label}-${index}`}>
                    <button onClick={() => openScreen(step)}>{step.label}</button>
                    {index < flow.steps.length - 1 && <Icon name="arrow" size={14} />}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="audit-card">
        <Icon name="check" />
        <div>
          <strong>Responsive audit complete</strong>
          <p>Every Core screen is available at 375, 768, and 1280, with light and dark previews.</p>
        </div>
      </div>
    </div>
  );
}

function CoreScreens() {
  const [screen, setScreen] = useState<Screen>("Nurse dashboard");
  const [viewport, setViewport] = useState<Viewport>("Desktop 1280");
  const [darkPreview, setDarkPreview] = useState(false);
  const [dashboardSuccess, setDashboardSuccess] = useState(false);
  const [adminDetailTab, setAdminDetailTab] = useState<AdminDetailTab>("Details");
  const [familyView, setFamilyView] = useState<"Needs attention" | "Doing well" | "No alerts">(
    "Needs attention",
  );
  const [userDetailSelf, setUserDetailSelf] = useState(false);
  const [accountRole, setAccountRole] = useState<"Nurse" | "Family" | "Admin">("Nurse");
  const [accountPasswordState, setAccountPasswordState] = useState<
    "Default" | "Wrong password" | "Locked"
  >("Default");
  const isAdminScreen =
    screen === "Admin patients" ||
    screen === "Add patient" ||
    screen === "Admin patient detail" ||
    screen === "Admin users" ||
    screen === "Add user" ||
    screen === "Admin user detail" ||
    screen === "Admin rooms" ||
    screen === "Admin settings";
  const supportsDarkPreview = true;
  const activeNav: "Dashboard" | "Home" | "Patients" | "Users" | "Rooms" | "Settings" | "Account" =
    screen === "Account"
      ? "Account"
      : screen === "Family home"
        ? "Home"
        : screen === "Admin users" || screen === "Add user" || screen === "Admin user detail"
          ? "Users"
          : screen === "Admin rooms"
            ? "Rooms"
            : screen === "Admin settings"
              ? "Settings"
              : isAdminScreen
                ? "Patients"
                : "Dashboard";
  return (
    <div className="page core-page">
      <div className="page-title split-title">
        <div>
          <p className="eyebrow">Signed-in experience</p>
          <h1>Core screens</h1>
          <p>Sign-in, nurse, family, and admin workflows using only the foundation system.</p>
        </div>
        {supportsDarkPreview && (
          <button className="theme-switch" onClick={() => setDarkPreview((value) => !value)}>
            <Icon name={darkPreview ? "sun" : "moon"} size={17} />
            {darkPreview ? "Light preview" : "Dark preview"}
          </button>
        )}
      </div>
      <div className="preview-controls">
        <Segmented
          options={
            [
              "Sign-in",
              "Nurse dashboard",
              "Alert detail",
              "Patient page",
              "Family home",
              "Admin patients",
              "Add patient",
              "Admin patient detail",
              "Admin users",
              "Add user",
              "Admin user detail",
              "Admin rooms",
              "Admin settings",
              "Account",
              "Notification previews",
              "Global states",
              "Prototype flows",
            ] as const
          }
          value={screen}
          onChange={(nextScreen) => {
            if (nextScreen === "Nurse dashboard") setDashboardSuccess(false);
            if (nextScreen === "Admin patient detail") setAdminDetailTab("Details");
            setScreen(nextScreen);
          }}
          label="Screen"
        />
        <Segmented
          options={["Mobile 375", "Tablet 768", "Desktop 1280"] as const}
          value={viewport}
          onChange={setViewport}
          label="Viewport"
        />
        {screen === "Family home" && (
          <Segmented
            options={["Needs attention", "Doing well", "No alerts"] as const}
            value={familyView}
            onChange={setFamilyView}
            label="Family home preview state"
          />
        )}
        {screen === "Admin user detail" && (
          <Segmented
            options={["Other user", "Own admin account"] as const}
            value={userDetailSelf ? "Own admin account" : "Other user"}
            onChange={(value) => setUserDetailSelf(value === "Own admin account")}
            label="User detail preview"
          />
        )}
        {screen === "Account" && (
          <>
            <Segmented
              options={["Nurse", "Family", "Admin"] as const}
              value={accountRole}
              onChange={setAccountRole}
              label="Account role"
            />
            <Segmented
              options={["Default", "Wrong password", "Locked"] as const}
              value={accountPasswordState}
              onChange={setAccountPasswordState}
              label="Password state"
            />
          </>
        )}
      </div>
      <p className="preview-description">
        Previewing <strong>{screen}</strong> at <strong>{viewport}</strong>
        {supportsDarkPreview && darkPreview ? " · dark mode" : " · light mode"}
      </p>
      <PreviewShell
        viewport={viewport}
        dark={supportsDarkPreview && darkPreview}
        showChrome={screen !== "Sign-in"}
        role={
          screen === "Family home" || (screen === "Account" && accountRole === "Family")
            ? "family"
            : isAdminScreen || (screen === "Account" && accountRole === "Admin")
              ? "admin"
              : "nurse"
        }
        activeNav={activeNav}
      >
        {screen === "Sign-in" ? (
          <SignInScreen />
        ) : screen === "Nurse dashboard" ? (
          <DashboardScreen
            openPatient={() => setScreen("Patient page")}
            success={dashboardSuccess}
          />
        ) : screen === "Alert detail" ? (
          <AlertDetailScreen />
        ) : screen === "Patient page" ? (
          <PatientScreen />
        ) : screen === "Family home" ? (
          <FamilyHomeScreen view={familyView} />
        ) : screen === "Admin patients" ? (
          <AdminPatientsScreen
            onAdd={() => setScreen("Add patient")}
            onOpen={() => {
              setAdminDetailTab("Details");
              setScreen("Admin patient detail");
            }}
          />
        ) : screen === "Add patient" ? (
          <AddPatientScreen onBack={() => setScreen("Admin patients")} />
        ) : screen === "Admin patient detail" ? (
          <AdminPatientDetailScreen initialTab={adminDetailTab} />
        ) : screen === "Admin users" ? (
          <AdminUsersScreen
            onAdd={() => setScreen("Add user")}
            onOpen={(self) => {
              setUserDetailSelf(self);
              setScreen("Admin user detail");
            }}
          />
        ) : screen === "Add user" ? (
          <AddUserScreen onBack={() => setScreen("Admin users")} />
        ) : screen === "Admin user detail" ? (
          <AdminUserDetailScreen self={userDetailSelf} />
        ) : screen === "Admin rooms" ? (
          <AdminRoomsScreen />
        ) : screen === "Admin settings" ? (
          <AdminSettingsScreen />
        ) : screen === "Account" ? (
          <AccountScreen role={accountRole} passwordState={accountPasswordState} />
        ) : screen === "Notification previews" ? (
          <NotificationPreviewsScreen />
        ) : screen === "Global states" ? (
          <GlobalStatesScreen />
        ) : (
          <PrototypeFlowsScreen
            openScreen={(target) => {
              setDashboardSuccess(Boolean(target.dashboardSuccess));
              if (target.adminTab) setAdminDetailTab(target.adminTab);
              setScreen(target.screen);
            }}
          />
        )}
      </PreviewShell>
    </div>
  );
}

function StretchHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="product-page-heading stretch-heading">
      <div>
        <span className="stretch-tag">Stretch</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function AudioRemindersScreen({ onAdd }: { onAdd: () => void }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [items, setItems] = useState([
    {
      title: "Please use your walker",
      by: "Demo Family",
      date: "2026-11-10",
      plays: 3,
      active: true,
    },
    {
      title: "Your walker is beside the chair",
      by: "Demo Nurse",
      date: "2026-11-08",
      plays: 1,
      active: false,
    },
  ]);
  return (
    <div className="stretch-screen">
      <StretchHeading
        title="Audio reminders"
        description="Demo Patient A · P-0042 · Room R-204"
        action={<Button onClick={onAdd}>Add reminder</Button>}
      />
      <div className="audio-alert-example">
        <article className="pending-alert pending-escalated">
          <div className="alert-card-top">
            <AlertBadge level="Escalated" />
            <time>14:27 UTC</time>
          </div>
          <h3>Demo Patient A</h3>
          <p className="patient-meta">P-0042 · Room R-204 · Walker not detected</p>
          <p className="escalated-note">Audio reminder played 14:23, before escalation.</p>
        </article>
        <section className="stretch-card audio-timeline-card">
          <SectionHeader title="Alert timeline" />
          <ol className="timeline">
            <li>
              <span>
                <Icon name="check" size={14} />
              </span>
              <div>
                <strong>Warning detected</strong>
                <p>Walker not detected</p>
              </div>
              <time>14:22 UTC</time>
            </li>
            <li>
              <span>
                <Icon name="check" size={14} />
              </span>
              <div>
                <strong>Audio reminder played</strong>
                <p>Before escalation</p>
              </div>
              <time>14:23 UTC</time>
            </li>
            <li>
              <span>
                <Icon name="check" size={14} />
              </span>
              <div>
                <strong>Escalated</strong>
                <p>Nurse and family notified</p>
              </div>
              <time>14:27 UTC</time>
            </li>
          </ol>
        </section>
      </div>
      <section className="stretch-card">
        <SectionHeader
          title="Patient reminders"
          description="Played on a Warning before escalation."
        />
        <div className="reminder-list">
          {items.map((item) => (
            <article key={item.title}>
              <button
                className={`audio-play ${playing === item.title ? "playing" : ""}`}
                onClick={() => setPlaying(playing === item.title ? null : item.title)}
                aria-label={`${playing === item.title ? "Pause" : "Play"} ${item.title}`}
              >
                {playing === item.title ? "Ⅱ" : "▶"}
              </button>
              <div>
                <strong>“{item.title}”</strong>
                <p>
                  Added by {item.by} · {item.date}
                </p>
                <span>
                  Played {item.plays} {item.plays === 1 ? "time" : "times"}
                </span>
              </div>
              <label className="toggle-control">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={() =>
                    setItems((current) =>
                      current.map((currentItem) =>
                        currentItem.title === item.title
                          ? { ...currentItem, active: !currentItem.active }
                          : currentItem,
                      ),
                    )
                  }
                />
                <span />
                {item.active ? "Active" : "Inactive"}
              </label>
              <Button
                variant="secondary"
                onClick={() =>
                  setItems((current) =>
                    current.filter((currentItem) => currentItem.title !== item.title),
                  )
                }
              >
                Delete
              </Button>
            </article>
          ))}
        </div>
      </section>
      <section className="stretch-card">
        <SectionHeader title="Playback device" description="Device type is not yet decided." />
        <div className="device-grid">
          {[
            ["R-204", "Online"],
            ["R-205", "Offline"],
            ["H-2", "Not configured"],
          ].map(([room, status]) => (
            <article key={room}>
              <span className={`device-dot device-${status.toLowerCase().replace(" ", "-")}`} />
              <div>
                <strong>{room}</strong>
                <p>Playback device</p>
              </div>
              <StatusBadge
                status={
                  status === "Online" ? "Active" : status === "Offline" ? "Inactive" : "No data"
                }
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AddAudioReminderScreen() {
  const [mode, setMode] = useState<"Upload audio" | "Record in browser">("Upload audio");
  const [recorded, setRecorded] = useState(false);
  return (
    <div className="stretch-screen">
      <p className="back-link">‹ Audio reminders</p>
      <StretchHeading
        title="Add audio reminder"
        description="Demo Patient A · P-0042 · Room R-204"
      />
      <section className="stretch-card audio-add-card">
        <Field label="Reminder title" placeholder="Please use your walker" />
        <Segmented
          options={["Upload audio", "Record in browser"] as const}
          value={mode}
          onChange={setMode}
          label="Audio source"
        />
        {mode === "Upload audio" ? (
          <label className="file-upload audio-file-upload">
            <input type="file" accept="audio/*" />
            <Icon name="review" />
            <strong>Choose an audio file</strong>
            <span>Audio only. Preview it before saving.</span>
          </label>
        ) : (
          <div className="recorder-panel">
            <div className="level-meter" aria-label="Audio input level">
              {Array.from({ length: 18 }).map((_, index) => (
                <i key={index} style={{ height: `${18 + ((index * 13) % 42)}%` }} />
              ))}
            </div>
            <Button
              variant={recorded ? "secondary" : "danger"}
              onClick={() => setRecorded((current) => !current)}
            >
              {recorded ? "Re-record" : "Record"}
            </Button>
          </div>
        )}
        <div className="audio-preview">
          <button aria-label="Play preview">▶</button>
          <div>
            <strong>Preview recording</strong>
            <span>0:07</span>
          </div>
          <div className="audio-wave" />
        </div>
        <label className="checkbox-row consent-audio">
          <input type="checkbox" />
          <span>
            <strong>Consent to use this voice recording has been recorded.</strong>
            <small>The recording is used only for this patient’s mobility reminder.</small>
          </span>
        </label>
        <div className="form-actions">
          <Button variant="secondary">Cancel</Button>
          <Button>Save reminder</Button>
        </div>
      </section>
    </div>
  );
}

const activityStates = [
  ["Walking", "14:22", "H-2"],
  ["Standing", "14:19", "R-204"],
  ["Sitting", "14:03", "R-204"],
  ["Stationary", "13:48", "R-204"],
];

function ActivityRecognitionScreen() {
  return (
    <div className="stretch-screen">
      <StretchHeading
        title="Activity recognition"
        description="Current state and recent transitions for assigned patients."
      />
      <div className="activity-patient-grid">
        <article className="patient-summary">
          <div className="summary-heading">
            <div>
              <button>Demo Patient A</button>
              <p>P-0042 · Room R-204</p>
            </div>
            <span className="activity-chip activity-walking">Walking</span>
          </div>
          <p>Walker · updated 14:22 UTC</p>
        </article>
        <article className="patient-summary">
          <div className="summary-heading">
            <div>
              <button>Demo Patient B</button>
              <p>P-0043 · Room R-205</p>
            </div>
            <span className="activity-chip activity-sitting">Sitting</span>
          </div>
          <p>Cane · updated 14:20 UTC</p>
        </article>
      </div>
      <section className="stretch-card">
        <SectionHeader title="Activity log" description="Demo Patient A · Today" />
        <div className="day-strip" aria-label="Activity across the day">
          <span className="strip-stationary" style={{ flex: 3 }}>
            Stationary
          </span>
          <span className="strip-sitting" style={{ flex: 4 }}>
            Sitting
          </span>
          <span className="strip-standing" style={{ flex: 2 }}>
            Standing
          </span>
          <span className="strip-walking" style={{ flex: 3 }}>
            Walking
          </span>
        </div>
        <div className="activity-log">
          {activityStates.map(([state, time, room]) => (
            <article key={`${state}-${time}`}>
              <span className={`activity-chip activity-${state.toLowerCase()}`}>{state}</span>
              <strong>{time} UTC</strong>
              <p>Room {room}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChangesNoticedScreen({ onTrends }: { onTrends: () => void }) {
  return (
    <div className="stretch-screen">
      <StretchHeading
        title="Changes noticed"
        description="Placeholder indicators for significant mobility changes."
      />
      <div className="change-card-grid">
        {[
          [
            "Demo Patient A",
            "Walking time down 20% over 2 weeks",
            "Compared with the previous 2 weeks",
          ],
          ["Demo Patient B", "Walker use improved to 92% this week", "Up from 84% last week"],
          ["Demo Patient A", "More time stationary in the afternoon", "Up 18 minutes per day"],
        ].map(([patient, headline, detail]) => (
          <article key={headline}>
            <span className="placeholder-metric">Placeholder metric</span>
            <p>{patient}</p>
            <h2>{headline}</h2>
            <small>{detail}</small>
            <button onClick={onTrends}>
              View trends <Icon name="arrow" size={15} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function MiniBarChart({
  title,
  values,
  labels,
  marker,
}: {
  title: string;
  values: number[];
  labels: string[];
  marker?: number;
}) {
  const [table, setTable] = useState(false);
  return (
    <article className="trend-chart">
      <div className="chart-heading">
        <h3>{title}</h3>
        <button onClick={() => setTable((current) => !current)}>
          {table ? "Show chart" : "Show data table"}
        </button>
      </div>
      {table ? (
        <div className="chart-data-table">
          {labels.map((label, index) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{values[index]}%</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="bar-chart" role="img" aria-label={`${title}, labeled bar chart`}>
          {values.map((value, index) => (
            <div key={labels[index]}>
              {marker === index && <i className="prescription-marker">Prescription changed</i>}
              <span style={{ height: `${value}%` }}>
                <b>{value}%</b>
              </span>
              <small>{labels[index]}</small>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function PatientTrendsScreen() {
  const [range, setRange] = useState<"7 days" | "30 days" | "90 days">("30 days");
  return (
    <div className="stretch-screen">
      <StretchHeading
        title="Mobility trends"
        description="Demo Patient A · P-0042 · Nurse and admin view"
        action={
          <Segmented
            options={["7 days", "30 days", "90 days"] as const}
            value={range}
            onChange={setRange}
            label="Date range"
          />
        }
      />
      <div className="trend-summary-grid">
        <article>
          <span>Walker compliance</span>
          <strong>88%</strong>
          <small>↓ 4 points</small>
        </article>
        <article>
          <span>Walking time</span>
          <strong>42 min</strong>
          <small>Daily average</small>
        </article>
        <article>
          <span>Alerts</span>
          <strong>6</strong>
          <small>2 escalated</small>
        </article>
      </div>
      <div className="trend-chart-grid">
        <MiniBarChart
          title="Compliance per day"
          values={[92, 90, 87, 84, 86, 88, 88]}
          labels={["M", "T", "W", "T", "F", "S", "S"]}
          marker={3}
        />
        <MiniBarChart
          title="Aid usage mix"
          values={[88, 8, 4]}
          labels={["Walker", "Cane", "None"]}
        />
        <MiniBarChart
          title="Walking time per day"
          values={[70, 64, 72, 58, 62, 55, 60]}
          labels={["M", "T", "W", "T", "F", "S", "S"]}
        />
      </div>
      <p className="chart-key">
        <span /> Patterned teal bars show measured values. Labels and values remain visible in all
        themes. <i /> Dashed marker: prescription changed.
      </p>
    </div>
  );
}

function FamilyTrendsScreen() {
  return (
    <div className="stretch-screen family-trends">
      <StretchHeading
        title="Mobility update"
        description="A simple weekly view for Demo Patient A."
      />
      <section className="stretch-card">
        <h2>This week: using the walker 92% of the time</h2>
        <p>This is slightly better than last week.</p>
        <div className="family-compliance-chart">
          {[86, 90, 91, 94, 93, 95, 92].map((value, index) => (
            <div key={index}>
              <span style={{ height: `${value}%` }}>
                <b>{value}%</b>
              </span>
              <small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</small>
            </div>
          ))}
        </div>
        <p className="chart-key">
          <span /> Walker used as prescribed, with values shown on every bar.
        </p>
      </section>
    </div>
  );
}

function WeeklyReportScreen({ email = false }: { email?: boolean }) {
  return (
    <div className={`stretch-screen ${email ? "report-email-frame" : ""}`}>
      <StretchHeading
        title={email ? "Your weekly mobility update" : "Weekly compliance report"}
        description={
          email
            ? "Demo Patient A · Week of 2026-11-02"
            : "Demo Patient A · P-0042 · Week of 2026-11-02"
        }
        action={
          !email ? (
            <div className="report-actions">
              <Button variant="secondary">Download PDF</Button>
              <Button>Share with family</Button>
            </div>
          ) : undefined
        }
      />
      <section className="report-sheet">
        <div className="report-summary">
          <article>
            <span>Compliance</span>
            <strong>92%</strong>
            <small>+4 points</small>
          </article>
          <article>
            <span>Alerts</span>
            <strong>3</strong>
            <small>This week</small>
          </article>
          <article>
            <span>Escalations</span>
            <strong>1</strong>
            <small>Acknowledged</small>
          </article>
        </div>
        <MiniBarChart
          title="Weekly compliance trend"
          values={[82, 85, 88, 86, 90, 91, 92]}
          labels={["W1", "W2", "W3", "W4", "W5", "W6", "Now"]}
          marker={4}
        />
        <div className="notable-changes">
          <h3>Notable changes</h3>
          <p>
            <Icon name="arrow" size={15} /> Walker use improved by 4 percentage points.
          </p>
          <p>
            <Icon name="arrow" size={15} /> Walking time stayed steady at about 42 minutes per day.
          </p>
        </div>
        {email && (
          <footer>
            No camera images are captured. Sign in to view full details. All times are UTC.
          </footer>
        )}
      </section>
    </div>
  );
}

function ReminderPrototypeScreen() {
  const [step, setStep] = useState<"Add reminder" | "Alert history">("Add reminder");
  return (
    <div className="stretch-screen">
      <StretchHeading
        title="Reminder prototype"
        description="Family adds a reminder and later sees that it played."
      />
      <div className="prototype-stepper">
        <button
          className={step === "Add reminder" ? "active" : ""}
          onClick={() => setStep("Add reminder")}
        >
          <span>1</span> Add reminder
        </button>
        <Icon name="arrow" />
        <button
          className={step === "Alert history" ? "active" : ""}
          onClick={() => setStep("Alert history")}
        >
          <span>2</span> Alert history
        </button>
      </div>
      {step === "Add reminder" ? (
        <section className="stretch-card prototype-reminder-card">
          <Field label="Reminder title" placeholder="Please use your walker" />
          <div className="audio-preview">
            <button>▶</button>
            <div>
              <strong>Family voice reminder</strong>
              <span>0:07</span>
            </div>
            <div className="audio-wave" />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" defaultChecked />
            <span>
              <strong>Consent to use this recording has been recorded.</strong>
            </span>
          </label>
          <Button onClick={() => setStep("Alert history")}>Save reminder</Button>
        </section>
      ) : (
        <section className="stretch-card">
          <SectionHeader title="Alert history" description="Demo Patient A · Room R-204" />
          <article className="prototype-alert-history">
            <AlertBadge level="Escalated" />
            <div>
              <strong>Walker was not detected · 14:22 UTC</strong>
              <p>Audio reminder played 14:23, before escalation.</p>
              <span>Acknowledged by a nurse</span>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}

function StretchScreenContent({
  screen,
  setScreen,
}: {
  screen: StretchScreen;
  setScreen: (screen: StretchScreen) => void;
}) {
  if (screen === "Audio reminders")
    return <AudioRemindersScreen onAdd={() => setScreen("Add audio reminder")} />;
  if (screen === "Add audio reminder") return <AddAudioReminderScreen />;
  if (screen === "Activity recognition") return <ActivityRecognitionScreen />;
  if (screen === "Changes noticed")
    return <ChangesNoticedScreen onTrends={() => setScreen("Patient trends")} />;
  if (screen === "Patient trends") return <PatientTrendsScreen />;
  if (screen === "Family trends") return <FamilyTrendsScreen />;
  if (screen === "Weekly report") return <WeeklyReportScreen />;
  if (screen === "Report email") return <WeeklyReportScreen email />;
  return <ReminderPrototypeScreen />;
}

function PhaseTwo() {
  const [screen, setScreen] = useState<StretchScreen>("Audio reminders");
  const [viewport, setViewport] = useState<Viewport>("Desktop 1280");
  const [dark, setDark] = useState(false);
  const familyScreen =
    screen === "Family trends" || screen === "Report email" || screen === "Reminder prototype";
  return (
    <div className="page core-page">
      <div className="page-title split-title">
        <div>
          <p className="eyebrow">Future product concepts</p>
          <h1>Phase 2 (stretch)</h1>
          <p>Exploratory extensions using the same accessible design system.</p>
        </div>
        <button className="theme-switch" onClick={() => setDark((current) => !current)}>
          <Icon name={dark ? "sun" : "moon"} size={17} />
          {dark ? "Light preview" : "Dark preview"}
        </button>
      </div>
      <div className="preview-controls">
        <Segmented
          options={
            [
              "Audio reminders",
              "Add audio reminder",
              "Activity recognition",
              "Changes noticed",
              "Patient trends",
              "Family trends",
              "Weekly report",
              "Report email",
              "Reminder prototype",
            ] as const
          }
          value={screen}
          onChange={setScreen}
          label="Stretch screen"
        />
        <Segmented
          options={["Mobile 375", "Tablet 768", "Desktop 1280"] as const}
          value={viewport}
          onChange={setViewport}
          label="Viewport"
        />
      </div>
      <p className="preview-description">
        Previewing <strong>{screen}</strong> at <strong>{viewport}</strong> ·{" "}
        {dark ? "dark mode" : "light mode"}
      </p>
      <PreviewShell
        viewport={viewport}
        dark={dark}
        role={familyScreen ? "family" : "nurse"}
        activeNav={familyScreen ? "Home" : "Dashboard"}
      >
        <StretchScreenContent screen={screen} setScreen={setScreen} />
      </PreviewShell>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("Foundations");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header-inner">
          <button
            className="site-brand"
            onClick={() => setPage("Foundations")}
            aria-label="Mobility Aid Compliance foundations"
          >
            <span>
              <Icon name="dashboard" size={17} />
            </span>
            <b>
              Mobility Aid <i>Compliance</i>
            </b>
          </button>
          <nav aria-label="Design pages">
            {pageNames.map((item) => (
              <button
                key={item}
                className={page === item ? "active" : ""}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ))}
          </nav>
          <button
            className="icon-button"
            onClick={() => setDark((value) => !value)}
            aria-label={`Use ${dark ? "light" : "dark"} mode`}
          >
            <Icon name={dark ? "sun" : "moon"} />
          </button>
        </div>
      </header>
      <main>
        {page === "Foundations" ? (
          <Foundations />
        ) : page === "Core screens" ? (
          <CoreScreens />
        ) : (
          <PhaseTwo />
        )}
      </main>
      <footer className="site-footer">
        <strong>Mobility Aid Compliance</strong>
        <span>All times shown in UTC</span>
        <span>
          <Icon name="eyeOff" size={14} />
          No camera images are captured
        </span>
      </footer>
    </div>
  );
}
