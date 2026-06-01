import { useState, useEffect, useRef, useCallback } from "react";

// ─── API call — goes through the backend at localhost:3000 ──────────────────
// In development, package.json "proxy" forwards /departures → localhost:3000
// In production (Render), set REACT_APP_API_URL to your deployed backend URL
const API_BASE = process.env.REACT_APP_API_URL || "";

async function fetchDepartures(q) {
  const res = await fetch(`${API_BASE}/departures?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data; // { query, stations: [{ name, departures: [...] }] }
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const FONT_BODY = "'Caveat', cursive";
const FONT_HEAD = "'Caveat Brush', cursive";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f0e8",
    fontFamily: FONT_BODY,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px 60px",
    position: "relative",
  },
  paperOverlay: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 640,
  },
  title: {
    fontFamily: FONT_HEAD,
    fontSize: "clamp(2rem, 6vw, 3rem)",
    fontWeight: "400",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: "0.01em",
    textShadow: "2px 2px 0 rgba(0,0,0,0.06)",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 18px",
    fontSize: "1.4rem",
    fontFamily: FONT_BODY,
    background: "#fdf8ec",
    border: "2.5px solid #b89060",
    borderRadius: "6px",
    outline: "none",
    color: "#1a1a1a",
    boxShadow: "3px 3px 0 #b89060, inset 0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 24,
  },
  statusRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: "1.25rem",
    color: "#5a4020",
    minHeight: 40,
    marginBottom: 12,
  },
  spinner: {
    display: "inline-block",
    width: 22,
    height: 22,
    border: "3px solid #b89060",
    borderTopColor: "#5a4020",
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 2,
    animation: "spin 0.9s linear infinite",
  },
  stationBlock: { marginBottom: 28 },
  stationName: {
    fontFamily: FONT_HEAD,
    fontSize: "1.35rem",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  divider: { display: "flex", gap: 6, justifyContent: "center", margin: "18px 0" },
  dash: { width: 24, height: 4, background: "#b89060", borderRadius: 2 },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fdf8ec",
    border: "2px solid #b89060",
    borderRadius: 6,
    overflow: "hidden",
    boxShadow: "3px 3px 0 #b89060",
  },
  th: {
    padding: "8px 12px",
    textAlign: "left",
    fontFamily: FONT_BODY,
    fontSize: "1rem",
    color: "#7a5020",
    borderBottom: "1.5px solid #d4a96a",
    background: "#f5edd8",
  },
  td: {
    padding: "9px 12px",
    fontSize: "1.15rem",
    color: "#1a1a1a",
    borderBottom: "1px solid #e8d8b0",
  },
  noTrains: {
    textAlign: "center",
    color: "#8a6840",
    fontSize: "1.2rem",
    padding: "18px 0",
    fontStyle: "italic",
  },
  emptyState: {
    textAlign: "center",
    color: "#a08060",
    fontSize: "1.2rem",
    marginTop: 20,
    lineHeight: 1.6,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function DelayBadge({ delay, canceled }) {
  if (canceled) return <span style={{ color: "#b03020" }}>Canceled</span>;
  if (delay === 0) return <span style={{ color: "#3a7a30" }}>On Time</span>;
  const color = delay >= 10 ? "#b03020" : "#907030";
  return <span style={{ color, fontWeight: "bold" }}>+{delay} min{delay >= 10 ? "!" : ""}</span>;
}

function StationBlock({ name, departures, isLast }) {
  return (
    <>
      <div style={styles.stationBlock}>
        <div style={styles.stationName}>Station: {name}</div>
        {departures.length === 0 ? (
          <p style={styles.noTrains}>No departures in the next 15 minutes.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Train</th>
                <th style={styles.th}>Destination</th>
                <th style={styles.th}>Scheduled</th>
                <th style={styles.th}>Delay</th>
                <th style={styles.th}>Platform</th>
              </tr>
            </thead>
            <tbody>
              {departures.map((d, i) => (
                <tr key={i} style={d.canceled ? { opacity: 0.5, textDecoration: "line-through" } : {}}>
                  <td style={styles.td}>{d.train}</td>
                  <td style={styles.td}>{d.destination}</td>
                  <td style={styles.td}>{d.scheduledTime}</td>
                  <td style={styles.td}><DelayBadge delay={d.delayMinutes} canceled={d.canceled} /></td>
                  <td style={styles.td}>{d.platform || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!isLast && (
        <div style={styles.divider}>
          {[0,1,2,3].map(i => <div key={i} style={styles.dash} />)}
        </div>
      )}
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [stations, setStations] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    setStatus("loading");
    setStations([]);
    try {
      const data = await fetchDepartures(q);
      setStations(data.stations || []);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query) { setStatus("idle"); setStations([]); return; }
    if (query.length < 3) { setStatus("warn"); setStations([]); return; }
    debounceRef.current = setTimeout(() => runSearch(query), 500);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::placeholder { color: #b0987a; font-family: 'Caveat', cursive; font-size: 1.2rem; }
      `}</style>

      <div style={styles.page}>
        <div style={styles.paperOverlay} />
        <div style={styles.content}>

          <h1 style={styles.title}>🚆 Lagovia Train Tracker</h1>

          <input
            style={styles.input}
            type="text"
            placeholder="Type station name... (e.g., Bru)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          {status === "warn" && (
            <div style={styles.statusRow}>
              <span>⚠️</span>
              <span>Keep typing! We need at least 3 characters to find your station.</span>
            </div>
          )}

          {status === "loading" && (
            <div style={styles.statusRow}>
              <span style={styles.spinner} />
              <span>Fetching departures...</span>
            </div>
          )}

          {status === "error" && (
            <div style={{ ...styles.statusRow, color: "#b03020" }}>
              <span>❌</span>
              <span>{errorMsg || "Something went wrong."}</span>
            </div>
          )}

          {status === "done" && stations.length === 0 && (
            <p style={styles.emptyState}>No stations found matching "{query}".</p>
          )}

          {status === "done" && stations.length > 0 && (
            <>
              <div style={{ fontFamily: FONT_HEAD, fontSize: "1.5rem", textAlign: "center", marginBottom: 20 }}>
                Departures (next 15 mins):
              </div>
              {stations.map((s, i) => (
                <StationBlock
                  key={s.id}
                  name={s.name}
                  departures={s.departures}
                  isLast={i === stations.length - 1}
                />
              ))}
            </>
          )}

          {status === "idle" && (
            <p style={styles.emptyState}>
              Start typing a Belgian station name above.<br />
              The trains are waiting — well, <em>late</em>, but waiting.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
