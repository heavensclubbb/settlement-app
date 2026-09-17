import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Home,
  Activity,
  User,
  Bell,
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
// Design tokens — Settled brand system (settled-tokens.css)
// ---------------------------------------------------------------------------
const ink = "#162D2A"; // --st-ink
const paper = "#F7F8F5"; // --st-canvas
const slate = "#596B65"; // --st-muted
const hairline = "#DCE3DE"; // --st-border
const signal = "#175C4B"; // --st-brand
const signalSoft = "#E8F3EC"; // --st-success-bg
const gold = "#8A4B08"; // --st-warning
const goldSoft = "#FFF2DF"; // --st-warning-bg
const danger = "#A52D32"; // --st-danger
const dangerSoft = "#FCECED"; // --st-danger-bg

const serif = "'Inter', system-ui, -apple-system, sans-serif"; // tabular numerals, no serif in Settled system
const sans = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
  return `Files by ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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

// pulls a defendant/company name out of a legal caption like
// "Regueiro v. FCA US LLC, Case No. 2:22-cv-05521" -> "FCA US LLC"
function extractDefendant(caseName) {
  const m = caseName.match(/\bv\.?\s+(.+?)(?:,\s*Case No\.?.*)?$/i);
  return m ? m[1].trim() : null;
}

// the company/brand name alone, for both the headline and a logo lookup
function companyGuess(caseName) {
  if (!caseName) return "";

  // "Brand - Description ..." format (a real spaced dash, not a hyphenated
  // case number like "2:22-cv-05521" which has no surrounding spaces)
  const dashSplit = caseName.split(/\s+[-–—]\s+/);
  if (dashSplit.length > 1 && dashSplit[0].split(" ").length <= 5) {
    return dashSplit[0].replace(/^In re:?\s*/i, "").trim();
  }

  // legal caption: "X v. Y LLC, Case No. ..."
  const defendant = extractDefendant(caseName);
  if (defendant) return defendant.replace(/,?\s*(LLC|Inc\.?|Corp\.?|Co\.?)\.?$/i, "").trim();

  // "In re: X Data Breach Litigation, Case No. ..."
  const inRe = caseName.match(/^In re:?\s*(.+?)\s+(Data Breach|Class Action|Litigation|Settlement)/i);
  if (inRe) return inRe[1].trim();

  return caseName.split(",")[0].trim();
}

// a short punchy headline for the home feed, in place of the full legal name
function cleanHeadline(caseName) {
  if (!caseName) return "Settlement";
  const stripped = caseName.replace(/\s*Class Action\s*(Settlement|Lawsuit)s?\s*$/i, "").trim();
  if (stripped !== caseName) return stripped; // already "Brand - Description" style

  const company = companyGuess(caseName);
  return company && company !== caseName ? `${company} Settlement` : caseName;
}

// a real greeting based on the current time, not a hardcoded guess
function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function brandInitial(record) {
  const src = record.administrator || record.case_name || "?";
  const cleaned = src.replace(/^(In re:?|c\/o).*?\b/i, "").trim();
  return (cleaned[0] || "?").toUpperCase();
}

// one short line instead of the full legal eligibility paragraph
function briefSummary(text, maxLen = 70) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

// a few words instead of a full sentence, for the home-feed row
function proofShortLabel(proofRequired) {
  switch (proofRequired) {
    case "none":
      return "No proof needed";
    case "attestation":
      return "Attestation only";
    case "receipt":
      return "Receipt required";
    case "specific_doc":
      return "Docs required";
    default:
      return "Check requirements";
  }
}

function mapRecord(url, record) {
  return {
    id: url,
    brand: record.administrator || record.case_name,
    company: companyGuess(record.case_name),
    initial: brandInitial(record),
    title: cleanHeadline(record.case_name),
    fullTitle: record.case_name,
    match: briefSummary(record.eligibility_criteria),
    proofShort: proofShortLabel(record.proof_required),

    deadline: formatDeadline(record.claim_deadline),
    payout: formatPayout(record.payout_structure, record.payout_amount),
    status: record.status,
    raw: record,
  };
}

// ---------------------------------------------------------------------------
// Accounts (Supabase) — the publishable key below is designed to be public;
// row-level security on the database is what actually protects each user's
// data, not secrecy of this key.
// ---------------------------------------------------------------------------
const SUPABASE_URL = "https://yxzjiqzdandvzguyokbg.supabase.co";
const SUPABASE_KEY = "sb_publishable_3_A1IbOs3TykRj58dtd7RA_hXzKc2VY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { experimental: { passkey: true } },
});

const passkeysSupported =
  typeof window !== "undefined" && !!window.PublicKeyCredential;

function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  return {
    session,
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signInWithPassword: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signInWithPasskey: () => supabase.auth.signInWithPasskey(),
    registerPasskey: () => supabase.auth.registerPasskey(),
    signOut: () => supabase.auth.signOut(),
  };
}

function useUserSettlements(userId) {
  const [statusMap, setStatusMap] = useState({});

  const refresh = () => {
    if (!userId) {
      setStatusMap({});
      return;
    }
    supabase
      .from("user_settlements")
      .select("settlement_url, status, updated_at")
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((row) => (map[row.settlement_url] = { status: row.status, updatedAt: row.updated_at }));
        setStatusMap(map);
      });
  };

  useEffect(refresh, [userId]);

  const markStatus = async (settlementUrl, status) => {
    if (!userId) return;
    // never downgrade a filed claim back to just "seen"
    if (status === "seen" && statusMap[settlementUrl]?.status === "filed") return;
    const updatedAt = new Date().toISOString();
    await supabase
      .from("user_settlements")
      .upsert(
        { user_id: userId, settlement_url: settlementUrl, status, updated_at: updatedAt },
        { onConflict: "user_id,settlement_url" }
      );
    setStatusMap((prev) => ({ ...prev, [settlementUrl]: { status, updatedAt } }));
  };

  return { statusMap, markStatus };
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
        background: signal,
        color: "#fff",
        fontFamily: sans,
        fontWeight: 600,
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

// Official Settled mark — rounded evergreen tile with a continuous white
// S-shaped line. Use this asset as-is; do not recreate it in CSS.
function SettledMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Settled">
      <rect width="40" height="40" rx="11" fill="#175C4B" />
      <path
        d="M28 12H18C10 12 10 20 18 20H22C30 20 30 28 22 28H12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// company name -> logo URL ("" once looked up with no result), shared across rows
// so the same brand isn't looked up more than once per session
const logoCache = {};

function CompanyLogo({ company, initial, size = 40 }) {
  const [logoUrl, setLogoUrl] = useState(() => logoCache[company] || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!company || logoCache[company] !== undefined) return;
    let cancelled = false;
    fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((results) => {
        const domain = results?.[0]?.domain || "";
        const url = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "";
        logoCache[company] = url;
        if (!cancelled) setLogoUrl(url);
      })
      .catch(() => {
        logoCache[company] = "";
        if (!cancelled) setLogoUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [company]);

  if (!logoUrl || failed) return <BrandMark initial={initial} size={size} />;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "#fff",
        border: `1px solid ${hairline}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <img
        src={logoUrl}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: "72%", height: "72%", objectFit: "contain" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function HomeScreen({ onOpenSettlement, onOpenBankPrompt, onOpenProfile, data, statusMap }) {
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SettledMark size={24} />
          <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: ink }}>settled</span>
        </div>
        <button
          onClick={onOpenProfile}
          aria-label="Account"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#EDF3EE",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <User size={16} color={ink} />
        </button>
      </div>
      <div style={{ padding: "22px 20px 4px" }}>
        <div style={{ fontFamily: sans, fontSize: 13, color: slate }}>
          {timeGreeting()}, Shiv
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
            background: "#EDF3EE",
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
        Open settlements
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
            <CompanyLogo company={s.company} initial={s.initial} />
            <div style={{ flex: 1, mi
