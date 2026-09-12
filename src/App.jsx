import React, { useState, useEffect } from "react";
import {
  Home,
  Activity,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  ShieldCheck,
  Lock,
  Landmark,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const ink = "#12203A";
const paper = "#FBFAF7";
const slate = "#5C6577";
const hairline = "#E2E0D9";
const signal = "#1E6F52";
const signalSoft = "#E7F1EC";
const gold = "#A9803E";
const goldSoft = "#F5EEE1";
const danger = "#9C4A3A";

const serif = "'Source Serif 4', Georgia, serif";
const sans = "'IBM Plex Sans', -apple-system, sans-serif";

// ---------------------------------------------------------------------------
// Live data
// ---------------------------------------------------------------------------
// Published by the crawl_topclassactions.py GitHub Action, once an hour.
const SETTLEMENTS_URL =
  "https://raw.githubusercontent.com/heavensclubbb/settlement-tracker/main/settlements.json";

const statusMeta = {
  live: { label: "Open", color: signal, bg: signalSoft },
  needs_review: { label: "Check details", color: gold, bg: goldSoft },
  closed: { label: "Closed", color: slate, bg: "#EEEDE8" },
};

function formatDeadline(dateStr) {
  if (!dateStr) return "No claim deadline listed";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return "No claim deadline listed";
  return `Files by ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function formatPayout(structure, amount) {
  const { min, max } = amount || {};
  if (structure === "flat" && (min || max)) return `$${min ?? max} flat`;
  if (min != null && max != null && min !== max) return `$${min} – $${max}`;
  if (min != null) return `$${min}+`;
  if (max != null) return `Up to $${max}`;
  if (structure === "pro_rata") return "Varies";
  return "Amount TBD";
}

function brandInitial(record) {
  const src = record.administrator || record.case_name || "?";
  const cleaned = src.replace(/^(In re:?|c\/o).*?\b/i, "").trim();
  return (cleaned[0] || "?").toUpperCase();
}

function mapRecord(url, record) {
  return {
    id: url,
    brand: record.administrator || record.case_name,
    initial: brandInitial(record),
    title: record.case_name,
    match: record.eligibility_criteria,
    deadline: formatDeadline(record.claim_deadline),
    payout: formatPayout(record.payout_structure, record.payout_amount),
    status: record.status,
    raw: record,
  };
}

function useSettlements() {
  const [state, setState] = useState({ loading: true, error: null, settlements: [] });

  useEffect(() => {
    let cancelled = false;
    fetch(SETTLEMENTS_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Object.entries(data)
          .map(([url, record]) => mapRecord(url, record))
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === "closed" ? 1 : -1;
            return (a.raw.claim_deadline || "9999").localeCompare(b.raw.claim_deadline || "9999");
          });
        setState({ loading: false, error: null, settlements: list });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, settlements: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function TopBar({ title, onBack }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "18px 20px 14px",
        borderBottom: `1px solid ${hairline}`,
        background: paper,
      }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            display: "flex",
            color: ink,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={22} />
        </button>
      ) : (
        <div style={{ width: 22 }} />
      )}
      <div
        style={{
          flex: 1,
          textAlign: "center",
          fontFamily: sans,
          fontSize: 15,
          fontWeight: 600,
          color: ink,
          marginRight: 22,
        }}
      >
        {title}
      </div>
    </div>
  );
}

function StatusTag({ status }) {
  const m = statusMeta[status];
  return (
    <span
      style={{
        fontFamily: sans,
        fontSize: 11.5,
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        borderRadius: 20,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}

function BrandMark({ initial, size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: ink,
        color: paper,
        fontFamily: serif,
        fontSize: size * 0.42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function HomeScreen({ onOpenSettlement, onOpenBankPrompt, data }) {
  const { loading, error, settlements } = data;
  const openCount = settlements.filter((s) => s.status !== "closed").length;

  if (loading) {
    return (
      <div style={{ background: paper, minHeight: "100%", padding: "22px 20px" }}>
        <div style={{ fontFamily: sans, fontSize: 13, color: slate }}>
          Loading settlements…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: paper, minHeight: "100%", padding: "22px 20px" }}>
        <div style={{ fontFamily: sans, fontSize: 13.5, color: ink, marginBottom: 6 }}>
          Couldn't load settlements
        </div>
        <div style={{ fontFamily: sans, fontSize: 12.5, color: slate }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ background: paper, minHeight: "100%" }}>
      <div style={{ padding: "22px 20px 4px" }}>
        <div style={{ fontFamily: sans, fontSize: 13, color: slate }}>
          Good afternoon, Shiv
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <span style={{ fontFamily: serif, fontSize: 40, color: ink, lineHeight: 1 }}>
            {openCount}
          </span>
        </div>
        <div style={{ fontFamily: sans, fontSize: 13, color: slate, marginTop: 4 }}>
          Open settlements being tracked right now
        </div>
      </div>

      <button
        onClick={onOpenBankPrompt}
        style={{
          margin: "18px 20px 6px",
          width: "calc(100% - 40px)",
          textAlign: "left",
          border: `1px solid ${hairline}`,
          borderRadius: 14,
          background: "#fff",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: "#F0F3F7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Landmark size={17} color={ink} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: ink }}>
            Connect a bank to auto-match
          </div>
          <div style={{ fontFamily: sans, fontSize: 12, color: slate, marginTop: 1 }}>
            Optional — you're browsing on self-reported purchases
          </div>
        </div>
        <ChevronRight size={16} color={slate} />
      </button>

      <div
        style={{
          margin: "22px 20px 10px",
          fontFamily: sans,
          fontSize: 12.5,
          fontWeight: 600,
          color: slate,
        }}
      >
        Matched to you
      </div>

      <div>
        {settlements.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onOpenSettlement(s)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              borderTop: i === 0 ? `1px solid ${hairline}` : "none",
              borderBottom: `1px solid ${hairline}`,
              padding: "16px 20px",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              cursor: "pointer",
            }}
          >
            <BrandMark initial={s.initial} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: ink,
                  marginBottom: 3,
                }}
              >
                {s.title}
              </div>
              <div style={{ fontFamily: sans, fontSize: 12.5, color: slate, marginBottom: 6 }}>
                {s.match}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <StatusTag status={s.status} />
                <span style={{ fontFamily: sans, fontSize: 11.5, color: slate }}>
                  {s.deadline}
                </span>
              </div>
            </div>
            <div
              style={{
                fontFamily: serif,
                fontSize: 15,
                color: ink,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              {s.payout}
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          margin: "18px 20px 30px",
          fontFamily: sans,
          fontSize: 12,
          color: slate,
          lineHeight: 1.5,
        }}
      >
        This list is checked against the source every hour. Payouts come
        from court-appointed administrators — never from us.
      </div>
    </div>
  );
}

const proofLabels = {
  none: "None — a signed attestation is enough, no documentation needed.",
  attestation: "A signed attestation confirming you meet the criteria.",
  receipt: "A receipt or other proof of purchase.",
  specific_doc: "Specific documentation — check the claim form for exactly what's needed.",
};

function SettlementDetail({ settlement, onBack, onFile }) {
  const s = settlement;
  const r = s.raw;
  const classPeriod =
    r.class_period?.start && r.class_period?.end
      ? `${r.class_period.start} – ${r.class_period.end}`
      : r.class_period?.end || "Not specified";

  return (
    <div style={{ background: paper, minHeight: "100%" }}>
      <TopBar title={s.brand} onBack={onBack} />
      <div style={{ padding: "22px 20px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <BrandMark initial={s.initial} size={46} />
          <div>
            <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: ink }}>
              {s.title}
            </div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: slate, marginTop: 2 }}>
              {s.deadline}
            </div>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${hairline}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: slate, marginBottom: 8 }}>
            Who's eligible
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <ShieldCheck size={16} color={signal} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontFamily: sans, fontSize: 13.5, color: ink, lineHeight: 1.5 }}>
              {r.eligibility_criteria}
            </div>
          </div>
        </div>

        <Section title="Class period">{classPeriod}</Section>

        <Section title="What you'd receive">
          <span style={{ fontFamily: serif, fontSize: 20, color: ink }}>{s.payout}</span>
        </Section>

        <Section title="Proof required">
          {proofLabels[r.proof_required] || "Check the claim form for details."}
          {r.proof_details ? ` ${r.proof_details}` : ""}
        </Section>

        <Section title="Source">
          Verified from the official notice on{" "}
          {new Date(r.last_verified_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          . <a href={r.source_url} target="_blank" rel="noreferrer" style={{ color: ink }}>
            View original notice
          </a>
        </Section>

        <button
          onClick={onFile}
          style={{
            width: "100%",
            marginTop: 8,
            background: ink,
            color: paper,
            border: "none",
            borderRadius: 12,
            padding: "15px 0",
            fontFamily: sans,
            fontSize: 14.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {r.claim_form_url ? "Go to claim form" : "Start claim"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: slate, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontFamily: sans, fontSize: 13.5, color: ink, lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

function ClaimFlow({ settlement, onBack, onSubmitted }) {
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [signed, setSigned] = useState("");
  const steps = ["Review match", "Your details", "Sign & submit"];

  return (
    <div style={{ background: paper, minHeight: "100%" }}>
      <TopBar
        title={steps[step]}
        onBack={() => (step === 0 ? onBack() : setStep(step - 1))}
      />
      <div style={{ display: "flex", gap: 6, padding: "16px 20px 0" }}>
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 3,
              background: i <= step ? ink : hairline,
            }}
          />
        ))}
      </div>

      <div style={{ padding: "22px 20px" }}>
        {step === 0 && (
          <>
            <div style={{ fontFamily: sans, fontSize: 13.5, color: ink, lineHeight: 1.55, marginBottom: 16 }}>
              Confirm the purchase this claim is based on before we prepare
              your form.
            </div>
            <div
              style={{
                border: `1px solid ${hairline}`,
                borderRadius: 14,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <Row label="Retailer" value={settlement.brand} />
              <Row label="Basis for match" value={settlement.match.replace("You told us ", "")} />
              <Row label="Class period" value="Jan 2021 – Jun 2023" last />
            </div>
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: ink }}
              />
              <span style={{ fontFamily: sans, fontSize: 13, color: ink, lineHeight: 1.5 }}>
                This purchase information is accurate to the best of my
                knowledge.
              </span>
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Full legal name" placeholder="Shiv" />
            <Field label="Mailing address" placeholder="Street, city, state, ZIP" />
            <Field label="Email" placeholder="you@email.com" />
            <div style={{ fontFamily: sans, fontSize: 12, color: slate, marginTop: 4, lineHeight: 1.5 }}>
              This goes to the settlement administrator only, to process your
              payout.
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontFamily: sans, fontSize: 13.5, color: ink, lineHeight: 1.55, marginBottom: 16 }}>
              Type your full name to sign this claim under penalty of
              perjury, as the settlement requires.
            </div>
            <Field
              label="Signature"
              placeholder="Type your full name"
              value={signed}
              onChange={setSigned}
            />
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                marginTop: 18,
                padding: 14,
                background: "#F0F3F7",
                borderRadius: 12,
              }}
            >
              <Lock size={15} color={slate} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: sans, fontSize: 12, color: slate, lineHeight: 1.5 }}>
                Your claim is sent directly to the court-appointed
                administrator. We never take a percentage of your payout.
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: "0 20px 24px" }}>
        <button
          disabled={step === 0 && !confirmed}
          onClick={() => (step < 2 ? setStep(step + 1) : onSubmitted())}
          style={{
            width: "100%",
            background: step === 0 && !confirmed ? "#C9CBCF" : ink,
            color: paper,
            border: "none",
            borderRadius: 12,
            padding: "15px 0",
            fontFamily: sans,
            fontSize: 14.5,
            fontWeight: 600,
            cursor: step === 0 && !confirmed ? "default" : "pointer",
          }}
        >
          {step < 2 ? "Continue" : "Submit claim"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${hairline}`,
      }}
    >
      <span style={{ fontFamily: sans, fontSize: 12.5, color: slate }}>{label}</span>
      <span style={{ fontFamily: sans, fontSize: 12.5, color: ink, fontWeight: 600, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, placeholder, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: sans, fontSize: 12, color: slate, marginBottom: 6 }}>{label}</div>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          width: "100%",
          border: `1px solid ${hairline}`,
          borderRadius: 10,
          padding: "11px 12px",
          fontFamily: sans,
          fontSize: 14,
          color: ink,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Confirmation({ settlement, onDone }) {
  return (
    <div
      style={{
        background: paper,
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: signalSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Check size={26} color={signal} />
      </div>
      <div style={{ fontFamily: serif, fontSize: 22, color: ink, marginBottom: 8 }}>
        Claim filed
      </div>
      <div style={{ fontFamily: sans, fontSize: 13.5, color: slate, lineHeight: 1.55, marginBottom: 28 }}>
        Your claim for the {settlement.brand} settlement was sent to the
        administrator. We'll notify you at each step.
      </div>
      <button
        onClick={onDone}
        style={{
          width: "100%",
          background: ink,
          color: paper,
          border: "none",
          borderRadius: 12,
          padding: "15px 0",
          fontFamily: sans,
          fontSize: 14.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Track this claim
      </button>
    </div>
  );
}

function TrackScreen() {
  const filed = [
    {
      brand: "Ashworth Fitness",
      initial: "A",
      payout: "$40",
      stage: 1,
      updated: "Filed Sep 2",
    },
    {
      brand: "Nordbrook Home Goods",
      initial: "N",
      payout: "$15–$60",
      stage: 3,
      updated: "Paid Aug 14",
    },
  ];
  const stages = ["Submitted", "Under review", "Approved", "Paid"];

  return (
    <div style={{ background: paper, minHeight: "100%" }}>
      <TopBar title="Activity" />
      <div style={{ padding: "20px" }}>
        {filed.map((f, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${hairline}`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <BrandMark initial={f.initial} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: ink }}>
                  {f.brand}
                </div>
                <div style={{ fontFamily: sans, fontSize: 12, color: slate }}>{f.updated}</div>
              </div>
              <div style={{ fontFamily: serif, fontSize: 15, color: ink }}>{f.payout}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {stages.map((label, si) => (
                <React.Fragment key={label}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 0 }}>
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: si <= f.stage ? signal : hairline,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 9.5,
                        color: si <= f.stage ? ink : slate,
                        marginTop: 6,
                        whiteSpace: "nowrap",
                        transform: "translateX(-50%)",
                      }}
                    >
                      {label}
                    </div>
                  </div>
                  {si < stages.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: si < f.stage ? signal : hairline,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div style={{ background: paper, minHeight: "100%" }}>
      <TopBar title="Profile" />
      <div style={{ padding: "20px" }}>
        <div
          style={{
            border: `1px solid ${hairline}`,
            borderRadius: 14,
            padding: "4px 16px",
            marginBottom: 18,
          }}
        >
          <ProfileRow label="Bank connection" value="Not connected" />
          <ProfileRow label="Reported brands & purchases" value="12" />
          <ProfileRow label="Email for alerts" value="you@email.com" last />
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: 14,
            background: "#F0F3F7",
            borderRadius: 12,
          }}
        >
          <Lock size={15} color={slate} style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontFamily: sans, fontSize: 12, color: slate, lineHeight: 1.5 }}>
            Bank matching is opt-in and off by default. When you turn it on,
            we read transaction data only — never your login credentials.
          </span>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: last ? "none" : `1px solid ${hairline}`,
      }}
    >
      <span style={{ fontFamily: sans, fontSize: 13.5, color: ink }}>{label}</span>
      <span style={{ fontFamily: sans, fontSize: 13.5, color: slate }}>{value}</span>
    </div>
  );
}

function BankPrompt({ onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(18,32,58,0.4)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: paper,
          width: "100%",
          borderRadius: "20px 20px 0 0",
          padding: "10px 22px 26px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 4,
            background: hairline,
            margin: "6px auto 18px",
          }}
        />
        <div style={{ fontFamily: serif, fontSize: 20, color: ink, marginBottom: 8 }}>
          Auto-matching isn't on yet
        </div>
        <div style={{ fontFamily: sans, fontSize: 13.5, color: slate, lineHeight: 1.55, marginBottom: 18 }}>
          This first version matches settlements from what you tell us and
          any receipts you upload. Bank-based auto-detection is next — when
          it ships, it'll be opt-in, read-only, and revocable anytime.
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: ink,
            color: paper,
            border: "none",
            borderRadius: 12,
            padding: "14px 0",
            fontFamily: sans,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
function TabBar({ tab, setTab }) {
  const items = [
    { id: "home", icon: Home, label: "Home" },
    { id: "track", icon: Activity, label: "Activity" },
    { id: "profile", icon: User, label: "Profile" },
  ];
  return (
    <div
      style={{
        display: "flex",
        borderTop: `1px solid ${hairline}`,
        background: paper,
        padding: "10px 0 18px",
      }}
    >
      {items.map((it) => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              color: active ? ink : slate,
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
            <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: active ? 600 : 400 }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------
export default function App() {
  const [tab, setTab] = useState("home");
  const [view, setView] = useState("list"); // list | detail | claim | confirmation
  const [activeSettlement, setActiveSettlement] = useState(null);
  const [showBankPrompt, setShowBankPrompt] = useState(false);
  const settlementsData = useSettlements();

  let body;
  if (tab === "home") {
    if (view === "list") {
      body = (
        <HomeScreen
          data={settlementsData}
          onOpenSettlement={(s) => {
            setActiveSettlement(s);
            setView("detail");
          }}
          onOpenBankPrompt={() => setShowBankPrompt(true)}
        />
      );
    } else if (view === "detail") {
      body = (
        <SettlementDetail
          settlement={activeSettlement}
          onBack={() => setView("list")}
          onFile={() => {
            const url = activeSettlement?.raw?.claim_form_url;
            if (url) window.open(url, "_blank");
            else setView("claim");
          }}
        />
      );
    } else if (view === "claim") {
      body = (
        <ClaimFlow
          settlement={activeSettlement}
          onBack={() => setView("detail")}
          onSubmitted={() => setView("confirmation")}
        />
      );
    } else if (view === "confirmation") {
      body = (
        <Confirmation
          settlement={activeSettlement}
          onDone={() => {
            setView("list");
            setTab("track");
          }}
        />
      );
    }
  } else if (tab === "track") {
    body = <TrackScreen />;
  } else if (tab === "profile") {
    body = <ProfileScreen />;
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#EDEBE4",
        fontFamily: sans,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        input:focus { outline: none; border-color: ${ink} !important; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>
      <div
        style={{
          width: 390,
          height: 780,
          background: paper,
          borderRadius: 36,
          border: "10px solid #1B1B1B",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 60px rgba(18,32,58,0.25)",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto" }}>{body}</div>
        <TabBar tab={tab} setTab={setTab} />
        {showBankPrompt && <BankPrompt onClose={() => setShowBankPrompt(false)} />}
      </div>
    </div>
  );
}
