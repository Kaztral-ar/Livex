import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search, Moon, Sun, Download, Copy, BadgeCheck, Lock, Globe2, Users,
  UserCheck, UserX, Heart, ArrowUpDown, Filter, AlertCircle, Loader2,
  X, ChevronDown, Check, ScanLine, ShieldAlert,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ============================================================
   THEME TOKENS
   ============================================================ */
const THEMES = {
  dark: {
    bg: "#0D0F15",
    bgSubtle: "#12141C",
    card: "#181B25",
    cardBorder: "#262A38",
    cardHover: "#1E2230",
    text: "#F1F1EE",
    textMuted: "#8D93A6",
    textFaint: "#565C6E",
    accent: "#FF4D6D",
    accentText: "#FFFFFF",
    accentSoft: "rgba(255,77,109,0.14)",
    mutual: "#2DD4BF",
    fan: "#5B9BFF",
    notback: "#FBBF24",
    inputBg: "#12141C",
    skeleton: "#1D202B",
  },
  light: {
    bg: "#F3F4F8",
    bgSubtle: "#EAEBF1",
    card: "#FFFFFF",
    cardBorder: "#E3E5EC",
    cardHover: "#F7F8FB",
    text: "#14161E",
    textMuted: "#666B7C",
    textFaint: "#9A9FB0",
    accent: "#E1274A",
    accentText: "#FFFFFF",
    accentSoft: "rgba(225,39,74,0.09)",
    mutual: "#0D8E7F",
    fan: "#2457D9",
    notback: "#B4750B",
    inputBg: "#FFFFFF",
    skeleton: "#E9EAF0",
  },
};

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

/* ============================================================
   MOCK DATA GENERATION
   (see disclaimer in-app: this simulates a backend response;
   no real Instagram data is fetched)
   ============================================================ */
const ADJ = ["silent","amber","lunar","urban","velvet","rogue","cedar","copper","hollow","quiet","bright","salty","electric","wild","paper","northern","golden","stray","midnight","coastal","dusty","feral","vivid","humble"];
const NOUN = ["fox","harbor","atlas","willow","ember","current","canyon","pixel","meadow","ridge","comet","lantern","otter","forge","tide","thistle","orbit","quartz","sparrow","drift","ash","glacier","reef","echo"];
const FIRST = ["Maya","Leo","Ivy","Theo","Nora","Kai","Ada","Milo","Rosa","Finn","Zara","Owen","Luna","Eli","Sage","Remy","Nina","Jude","Talia","Marco","Iris","Cole","Freya","Amir"];
const LAST = ["Bennett","Ortega","Novak","Reyes","Whitaker","Kim","Duarte","Larsen","Osei","Ferreira","Nash","Petrov","Iyer","Solberg","Tan","Marsh","Dubois","Okafor","Lindqvist","Farah"];

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

function makeUser(rng, usedHandles) {
  let handle = `${pick(rng, ADJ)}.${pick(rng, NOUN)}`;
  if (rng() > 0.55) handle += Math.floor(rng() * 999);
  let base = handle, n = 1;
  while (usedHandles.has(handle)) { handle = `${base}${n}`; n++; }
  usedHandles.add(handle);
  const displayName = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
  return {
    id: handle,
    username: handle,
    displayName,
    avatarSeed: 1 + Math.floor(rng() * 70),
    verified: rng() < 0.06,
    private: rng() < 0.16,
  };
}

/** Deterministic-ish per-username mock "API response". Cheap to regenerate,
 *  cached in-memory by the caller so repeat lookups are instant. */
function buildAccountData(usernameRaw) {
  const username = usernameRaw.trim().replace(/^@/, "");
  const seed = hashStr(username.toLowerCase());
  const rng = mulberry32(seed);

  const totalFollowing = 140 + Math.floor(rng() * 520);
  const mutualCount = Math.floor(totalFollowing * (0.3 + rng() * 0.45));
  const notBackCount = totalFollowing - mutualCount;
  const fansCount = 90 + Math.floor(rng() * 2400);
  const totalFollowers = mutualCount + fansCount;

  const used = new Set();
  const mutuals = Array.from({ length: mutualCount }, () => makeUser(rng, used));
  const notBack = Array.from({ length: notBackCount }, () => makeUser(rng, used));
  const fans = Array.from({ length: fansCount }, () => makeUser(rng, used));

  return {
    username,
    displayName: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
    avatarSeed: 1 + Math.floor(rng() * 70),
    verified: rng() < 0.2,
    totalFollowers,
    totalFollowing,
    mutualCount,
    notBackCount,
    fansCount,
    lists: { mutuals, notBack, fans },
  };
}

/* Simulated network hop */
function fetchAccountAnalysis(username) {
  return new Promise((resolve, reject) => {
    const delay = 900 + Math.random() * 900;
    setTimeout(() => {
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(username.replace(/^@/, ""))) {
        reject(new Error("That doesn't look like a valid Instagram username."));
        return;
      }
      resolve(buildAccountData(username));
    }, delay);
  });
}

/* ============================================================
   SMALL PRESENTATIONAL PIECES
   ============================================================ */
function Avatar({ seed, size = 40 }) {
  return (
    <img
      src={`https://i.pravatar.cc/150?img=${seed}`}
      width={size}
      height={size}
      alt=""
      style={{ borderRadius: "9999px", objectFit: "cover", flexShrink: 0, width: size, height: size }}
      loading="lazy"
    />
  );
}

function VennDiagram({ fans, mutual, notBack, t }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <svg viewBox="0 0 320 190" style={{ width: "100%", maxWidth: 380, height: "auto", overflow: "visible" }}>
        <g style={{ transform: mounted ? "scale(1)" : "scale(0.85)", opacity: mounted ? 1 : 0, transformOrigin: "160px 95px", transition: "all 700ms cubic-bezier(.16,1,.3,1)" }}>
          <circle cx="118" cy="95" r="72" fill={t.fan} opacity="0.22" />
          <circle cx="202" cy="95" r="72" fill={t.notback} opacity="0.22" />
          <circle cx="118" cy="95" r="72" fill="none" stroke={t.fan} strokeWidth="1.5" />
          <circle cx="202" cy="95" r="72" fill="none" stroke={t.notback} strokeWidth="1.5" />
          <text x="70" y="90" fontSize="20" fontWeight="700" fill={t.text} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif">{fans}</text>
          <text x="70" y="110" fontSize="10" fill={t.textMuted} textAnchor="middle" fontFamily="'Inter',sans-serif">Fans</text>
          <text x="160" y="90" fontSize="20" fontWeight="700" fill={t.text} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif">{mutual}</text>
          <text x="160" y="110" fontSize="10" fill={t.textMuted} textAnchor="middle" fontFamily="'Inter',sans-serif">Mutual</text>
          <text x="250" y="90" fontSize="20" fontWeight="700" fill={t.text} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif">{notBack}</text>
          <text x="250" y="110" fontSize="10" fill={t.textMuted} textAnchor="middle" fontFamily="'Inter',sans-serif">No follow-back</text>
          <text x="70" y="35" fontSize="10.5" fontWeight="600" fill={t.fan} textAnchor="middle" fontFamily="'Inter',sans-serif" letterSpacing="0.4">FOLLOWERS</text>
          <text x="250" y="35" fontSize="10.5" fontWeight="600" fill={t.notback} textAnchor="middle" fontFamily="'Inter',sans-serif" letterSpacing="0.4">FOLLOWING</text>
        </g>
      </svg>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, t }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "'Inter',sans-serif", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </div>
      <span style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-0.02em" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function UserRow({ user, t, tone }) {
  return (
    <div className="transition-colors" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: t.card }}>
      <Avatar seed={user.avatarSeed} size={40} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13.5, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            @{user.username}
          </span>
          {user.verified && <BadgeCheck size={14} color={t.fan} style={{ flexShrink: 0 }} />}
          {user.private ? <Lock size={11} color={t.textFaint} style={{ flexShrink: 0 }} /> : <Globe2 size={11} color={t.textFaint} style={{ flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 12.5, color: t.textMuted, fontFamily: "'Inter',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.displayName}
        </div>
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3, color: tone, background: `${tone}1E`, padding: "4px 8px", borderRadius: 999, flexShrink: 0 }}>
        {user.private ? "PRIVATE" : "PUBLIC"}
      </span>
    </div>
  );
}

function SkeletonRow({ t }) {
  return (
    <div className="animate-pulse" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: t.card }}>
      <div style={{ width: 40, height: 40, borderRadius: 999, background: t.skeleton }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "40%", height: 10, borderRadius: 4, background: t.skeleton }} />
        <div style={{ width: "60%", height: 9, borderRadius: 4, background: t.skeleton }} />
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const TABS = [
  { key: "mutuals", label: "Mutual followers" },
  { key: "notBack", label: "Not following back" },
  { key: "fans", label: "Fans" },
];

export default function App() {
  const [themeName, setThemeName] = useState("dark");
  const t = THEMES[themeName];

  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | success
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState(null);

  const [activeTab, setActiveTab] = useState("mutuals");
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("none"); // none | asc | desc
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all"); // all | public | private
  const [visibleCount, setVisibleCount] = useState(24);
  const [toast, setToast] = useState("");

  const cacheRef = useRef({});
  const sentinelRef = useRef(null);

  const runAnalysis = useCallback((raw) => {
    const clean = raw.trim();
    if (!clean) { setStatus("error"); setErrorMsg("Enter a username first."); return; }
    setStatus("loading");
    setErrorMsg("");
    const key = clean.toLowerCase().replace(/^@/, "");
    if (cacheRef.current[key]) {
      setTimeout(() => { setData(cacheRef.current[key]); setStatus("success"); }, 180); // instant-ish, cached
      return;
    }
    fetchAccountAnalysis(clean)
      .then((res) => { cacheRef.current[key] = res; setData(res); setStatus("success"); })
      .catch((err) => { setStatus("error"); setErrorMsg(err.message || "Something went wrong."); });
  }, []);

  useEffect(() => {
    setVisibleCount(24);
  }, [activeTab, query, sortDir, verifiedOnly, typeFilter, data]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((c) => c + 24);
      }
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, query, sortDir, verifiedOnly, typeFilter, data, status]);

  const activeList = useMemo(() => {
    if (!data) return [];
    const key = activeTab === "mutuals" ? "mutuals" : activeTab === "notBack" ? "notBack" : "fans";
    let list = data.lists[key];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q));
    }
    if (verifiedOnly) list = list.filter((u) => u.verified);
    if (typeFilter !== "all") list = list.filter((u) => (typeFilter === "private" ? u.private : !u.private));
    if (sortDir !== "none") {
      list = [...list].sort((a, b) => sortDir === "asc" ? a.username.localeCompare(b.username) : b.username.localeCompare(a.username));
    }
    return list;
  }, [data, activeTab, query, verifiedOnly, typeFilter, sortDir]);

  const visibleList = activeList.slice(0, visibleCount);

  const toneFor = (tab) => tab === "mutuals" ? t.mutual : tab === "notBack" ? t.notback : t.fan;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  function handleCopy() {
    const txt = activeList.map((u) => "@" + u.username).join("\n");
    navigator.clipboard?.writeText(txt).then(() => showToast(`Copied ${activeList.length} usernames`));
  }
  function handleExport(format) {
    if (!activeList.length) return;
    if (format === "csv") {
      const header = "username,display_name,verified,account_type\n";
      const rows = activeList.map((u) => `${u.username},"${u.displayName}",${u.verified},${u.private ? "private" : "public"}`).join("\n");
      downloadFile(`${data.username}-${activeTab}.csv`, header + rows, "text/csv");
    } else {
      downloadFile(`${data.username}-${activeTab}.json`, JSON.stringify(activeList, null, 2), "application/json");
    }
    showToast(`Exported ${activeList.length} as ${format.toUpperCase()}`);
  }
  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter',sans-serif", transition: "background 300ms" }}>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        * { box-sizing: border-box; }
        ::selection { background: ${t.accent}55; }
        .ifa-scrollbar::-webkit-scrollbar { width: 6px; }
        .ifa-scrollbar::-webkit-scrollbar-thumb { background: ${t.cardBorder}; border-radius: 999px; }
        .ifa-tab-btn { transition: all 180ms ease; }
        .ifa-btn { transition: transform 120ms ease, opacity 120ms ease; }
        .ifa-btn:active { transform: scale(0.96); }
        .ifa-row-enter { animation: ifaFadeUp 320ms ease both; }
        @keyframes ifaFadeUp { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
        input::placeholder { color: ${t.textFaint}; }
      `}</style>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: `${t.bg}E6`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${t.cardBorder}` }}>
        <div className="max-w-5xl mx-auto" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ScanLine size={17} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15.5, color: t.text, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              Instagram Follow Analyzer
            </div>
            <div style={{ fontSize: 11, color: t.textFaint, whiteSpace: "nowrap" }}>See who isn't following you back</div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="ifa-btn"
            onClick={() => setThemeName(themeName === "dark" ? "light" : "dark")}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            aria-label="Toggle theme"
          >
            {themeName === "dark" ? <Sun size={16} color={t.textMuted} /> : <Moon size={16} color={t.textMuted} />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto" style={{ padding: "24px 20px 80px" }}>
        {/* SEARCH BAR */}
        <form
          onSubmit={(e) => { e.preventDefault(); runAnalysis(inputValue); }}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <div style={{ flex: "1 1 260px", display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: "0 14px", height: 50 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: t.textFaint, fontSize: 15 }}>@</span>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="public.username"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: t.text, fontFamily: "'IBM Plex Mono',monospace", fontSize: 14.5, minWidth: 0 }}
            />
          </div>
          <button
            type="submit"
            className="ifa-btn"
            disabled={status === "loading"}
            style={{ height: 50, padding: "0 22px", borderRadius: 14, border: "none", background: t.accent, color: "#fff", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: status === "loading" ? 0.75 : 1 }}
          >
            {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {status === "loading" ? "Analyzing" : "Analyze"}
          </button>
        </form>
        <p style={{ fontSize: 11.5, color: t.textFaint, marginTop: 8, lineHeight: 1.5 }}>
          Demo mode — results are generated locally to demonstrate the interface. No real Instagram data is fetched, scraped, or stored. See disclaimer below.
        </p>

        {/* ERROR */}
        {status === "error" && (
          <div className="ifa-row-enter" style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "flex-start", background: t.card, border: `1px solid ${t.notback}55`, borderRadius: 16, padding: 18 }}>
            <AlertCircle size={20} color={t.notback} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>We couldn't analyze that account</div>
              <div style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>{errorMsg}</div>
            </div>
          </div>
        )}

        {/* LOADING SKELETON */}
        {status === "loading" && (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="animate-pulse" style={{ height: 130, borderRadius: 16, background: t.skeleton }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginTop: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse" style={{ height: 78, borderRadius: 16, background: t.skeleton }} />)}
            </div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} t={t} />)}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {status === "idle" && !data && (
          <div className="ifa-row-enter" style={{ marginTop: 40, textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: t.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Users size={26} color={t.accent} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 19, color: t.text }}>Enter a public username to begin</div>
            <div style={{ color: t.textMuted, fontSize: 13.5, marginTop: 6, maxWidth: 380, margin: "6px auto 0" }}>
              We'll compare followers and following to surface mutuals, fans, and accounts that don't follow back.
            </div>
          </div>
        )}

        {/* SUCCESS: DASHBOARD */}
        {status === "success" && data && (
          <div className="ifa-row-enter" style={{ marginTop: 28 }}>
            {/* profile strip */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <Avatar seed={data.avatarSeed} size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: t.text }}>@{data.username}</span>
                  {data.verified && <BadgeCheck size={16} color={t.fan} />}
                </div>
                <div style={{ fontSize: 12.5, color: t.textMuted }}>{data.displayName}</div>
              </div>
            </div>

            {/* venn + bar chart */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,0.85fr)", gap: 14 }}>
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <VennDiagram fans={data.fansCount} mutual={data.mutualCount} notBack={data.notBackCount} t={t} />
              </div>
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "18px 18px 8px" }}>
                <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 4 }}>Followers vs following</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart
                    data={[
                      { name: "Followers", value: data.totalFollowers },
                      { name: "Following", value: data.totalFollowing },
                    ]}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fill: t.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: t.text }} cursor={{ fill: t.bgSubtle }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>
                      <Cell fill={t.fan} />
                      <Cell fill={t.accent} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginTop: 14 }}>
              <StatCard icon={Users} label="Total followers" value={data.totalFollowers} color={t.fan} t={t} />
              <StatCard icon={UserCheck} label="Total following" value={data.totalFollowing} color={t.accent} t={t} />
              <StatCard icon={Heart} label="Mutuals" value={data.mutualCount} color={t.mutual} t={t} />
              <StatCard icon={UserX} label="Non-followers" value={data.notBackCount} color={t.notback} t={t} />
              <StatCard icon={UserCheck} label="Fans" value={data.fansCount} color={t.fan} t={t} />
            </div>

            {/* tabs */}
            <div style={{ display: "flex", gap: 6, marginTop: 24, borderBottom: `1px solid ${t.cardBorder}`, overflowX: "auto" }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className="ifa-tab-btn"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "10px 4px", marginRight: 18, background: "none", border: "none", cursor: "pointer",
                    color: activeTab === tab.key ? t.text : t.textMuted,
                    fontWeight: activeTab === tab.key ? 700 : 500, fontSize: 13.5, whiteSpace: "nowrap",
                    borderBottom: activeTab === tab.key ? `2px solid ${toneFor(tab.key)}` : "2px solid transparent",
                  }}
                >
                  {tab.label} <span style={{ color: t.textFaint, fontWeight: 500 }}>
                    ({(tab.key === "mutuals" ? data.mutualCount : tab.key === "notBack" ? data.notBackCount : data.fansCount).toLocaleString()})
                  </span>
                </button>
              ))}
            </div>

            {/* toolbar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, alignItems: "center" }}>
              <div style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 8, background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "0 10px", height: 38 }}>
                <Search size={14} color={t.textFaint} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search username or name"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: t.text, fontSize: 13, minWidth: 0 }}
                />
                {query && <X size={13} color={t.textFaint} style={{ cursor: "pointer" }} onClick={() => setQuery("")} />}
              </div>

              <button
                className="ifa-btn"
                onClick={() => setSortDir(sortDir === "none" ? "asc" : sortDir === "asc" ? "desc" : "none")}
                style={{ height: 38, padding: "0 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: sortDir !== "none" ? t.accentSoft : t.card, color: t.text, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <ArrowUpDown size={13} /> {sortDir === "none" ? "Sort A–Z" : sortDir === "asc" ? "A → Z" : "Z → A"}
              </button>

              <button
                className="ifa-btn"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                style={{ height: 38, padding: "0 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: verifiedOnly ? t.accentSoft : t.card, color: t.text, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <BadgeCheck size={13} color={verifiedOnly ? t.fan : t.textMuted} /> Verified
              </button>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ height: 38, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.card, color: t.text, fontSize: 12.5, padding: "0 10px" }}
              >
                <option value="all">All accounts</option>
                <option value="public">Public only</option>
                <option value="private">Private only</option>
              </select>

              <div style={{ flex: 1 }} />

              <button className="ifa-btn" onClick={handleCopy} style={{ height: 38, padding: "0 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.card, color: t.text, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <Copy size={13} /> Copy
              </button>
              <button className="ifa-btn" onClick={() => handleExport("csv")} style={{ height: 38, padding: "0 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.card, color: t.text, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <Download size={13} /> CSV
              </button>
              <button className="ifa-btn" onClick={() => handleExport("json")} style={{ height: 38, padding: "0 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.card, color: t.text, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <Download size={13} /> JSON
              </button>
            </div>

            {/* list */}
            <div className="ifa-scrollbar" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleList.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: 13.5 }}>
                  Nothing matches your filters.
                </div>
              )}
              {visibleList.map((u) => (
                <UserRow key={u.id} user={u} t={t} tone={toneFor(activeTab)} />
              ))}
              {visibleCount < activeList.length && (
                <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", padding: "14px 0" }}>
                  <Loader2 size={18} className="animate-spin" color={t.textFaint} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        <div style={{ marginTop: 48, display: "flex", gap: 10, alignItems: "flex-start", background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: 16 }}>
          <ShieldAlert size={17} color={t.textFaint} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11.5, color: t.textFaint, lineHeight: 1.6, margin: 0 }}>
            Instagram Follow Analyzer is an independent demo and is not affiliated with, endorsed by, or connected to Instagram or Meta.
            This interface uses locally generated sample data — it does not access, scrape, or store any real Instagram account or credential.
            Instagram does not provide a public API for reading another account's followers or following list; building this against real
            data would require Meta's official Graph API (limited to accounts you manage) or scraping, which violates Instagram's Terms of Use.
            No passwords are collected and no personal data is stored by this app.
          </p>
        </div>
      </main>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: t.text, color: t.bg, padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.25)", zIndex: 50 }}>
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
