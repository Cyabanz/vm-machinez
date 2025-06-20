import { useState, useEffect } from "react";

export default function Home() {
  const [csrfToken, setCsrfToken] = useState(null);
  const [sessionUrl, setSessionUrl] = useState(null);
  const [timer, setTimer] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch CSRF token on mount
  useEffect(() => {
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken));
  }, []);

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const startSession = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hyperbeam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
          // "x-api-secret": "your_api_secret" // Optional
        },
      });
      const data = await res.json();
      if (data.url) {
        setSessionUrl(data.url);
        setTimer(720);
        // Countdown
        const id = setInterval(() => {
          setTimer((t) => {
            if (t <= 1) {
              clearInterval(id);
              endSession();
              return 0;
            }
            return t - 1;
          });
        }, 1000);
        setIntervalId(id);
      } else {
        setError(data.error || "Failed to start session");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    setSessionUrl(null);
    setTimer(0);
    if (intervalId) clearInterval(intervalId);
    try {
      await fetch("/api/end-hyperbeam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
          // "x-api-secret": "your_api_secret" // Optional
        },
      });
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    // End session on unload (tab close)
    const handler = () => endSession();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line
  }, [csrfToken]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Vapor-Style Hyperbeam Session</h1>
      {error && <div style={{ color: "red", margin: 10 }}>{error}</div>}
      {!sessionUrl && (
        <button onClick={startSession} disabled={loading || !csrfToken}>
          {loading ? "Starting..." : "Start Session"}
        </button>
      )}
      {sessionUrl && (
        <div>
          <p>
            <b>Session in progress!</b>
            <br />
            <a href={sessionUrl} target="_blank" rel="noopener noreferrer">
              Open your VM
            </a>
          </p>
          <p>
            Time left: <b>{formatTime(timer)}</b>
          </p>
          <button onClick={endSession}>End Session</button>
        </div>
      )}
    </div>
  );
}
