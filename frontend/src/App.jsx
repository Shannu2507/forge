import { useState, useRef, useEffect, useCallback } from "react";

const BUILD_TYPES = ["App", "Website", "Game", "AI agent", "Dashboard", "API"];

const EXAMPLE_PROMPTS = [
  "A fully playable Snake game with score tracking and increasing speed",
  "A personal portfolio site for a product designer named Alex",
  "A crypto price dashboard with live-looking charts and portfolio tracker",
  "An AI customer support agent for a coffee shop called Brew & Co",
  "A task management app with drag-and-drop kanban board",
  "A landing page for a fitness app called StrideAI",
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const BUILDS_KEY = "forge_builds";

function loadBuilds() {
  try { return JSON.parse(localStorage.getItem(BUILDS_KEY) || "[]"); } catch { return []; }
}
function saveBuilds(builds) {
  localStorage.setItem(BUILDS_KEY, JSON.stringify(builds.slice(0, 20)));
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("App");
  const [builds, setBuilds] = useState(loadBuilds);
  const [activeBuild, setActiveBuild] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const iframeRef = useRef(null);
  const codeRef = useRef("");

  const updateIframe = useCallback((html) => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, []);

  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;
    setIsBuilding(true);
    setActiveTab("preview");
    codeRef.current = "";
    setBuildLog("Thinking...");

    const newBuild = {
      id: Date.now(),
      prompt: prompt.trim(),
      type,
      createdAt: new Date().toISOString(),
      html: "",
      forks: 0,
      views: Math.floor(Math.random() * 50),
    };

    setActiveBuild(newBuild);

    try {
      const res = await fetch(`${BACKEND_URL}/api/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), type }),
      });

      if (!res.ok) throw new Error("Backend not reachable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.done) {
              const finalBuild = { ...newBuild, html: codeRef.current };
              const updated = [finalBuild, ...builds].slice(0, 20);
              setBuilds(updated);
              saveBuilds(updated);
              setActiveBuild(finalBuild);
              setBuildLog("Done");
            }
            if (data.text) {
              codeRef.current += data.text;
              const chars = codeRef.current.length;
              setBuildLog(`Building... ${chars} chars`);
              if (codeRef.current.includes("</html>") || codeRef.current.length > 2000) {
                updateIframe(codeRef.current);
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      setBuildLog("Error: " + err.message + ". Is the backend running?");
    } finally {
      setIsBuilding(false);
    }
  };

  useEffect(() => {
    if (activeBuild?.html) updateIframe(activeBuild.html);
  }, [activeBuild, updateIframe]);

  const forkBuild = (build) => {
    setPrompt(build.prompt);
    setType(build.type);
  };

  const typeColor = {
    App: "#7F77DD", Website: "#1D9E75", Game: "#D85A30",
    "AI agent": "#185FA5", Dashboard: "#854F0B", API: "#993556"
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0a0a0f", color: "#e8e6f0", fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Topbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 48, borderBottom: "1px solid #1e1e2e",
        background: "#0d0d14", flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 24, height: 24, background: "linear-gradient(135deg, #7F77DD, #D4537E)",
            borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff"
          }}>F</div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>Forge</span>
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 20,
            background: "#1e1e2e", color: "#7F77DD", border: "1px solid #2a2a3e", fontWeight: 500
          }}>BETA</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{
            background: "none", border: "1px solid #1e1e2e", borderRadius: 6,
            color: "#888", padding: "4px 10px", cursor: "pointer", fontSize: 12
          }}>
            {sidebarOpen ? "Hide history" : "Show history"}
          </button>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg, #534AB7, #D4537E)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "#fff"
          }}>U</div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 220, background: "#0d0d14", borderRight: "1px solid #1e1e2e",
            display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0
          }}>
            <div style={{ padding: "12px 12px 6px", fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>
              Recent builds
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {builds.length === 0 && (
                <div style={{ padding: "12px 14px", fontSize: 12, color: "#444" }}>
                  No builds yet. Create your first one!
                </div>
              )}
              {builds.map(b => (
                <div key={b.id} onClick={() => setActiveBuild(b)}
                  style={{
                    padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid #141420",
                    background: activeBuild?.id === b.id ? "#13131f" : "transparent",
                    transition: "background .15s"
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: typeColor[b.type] || "#7F77DD", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: typeColor[b.type] || "#7F77DD", fontWeight: 500 }}>{b.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {b.prompt}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                    <span style={{ fontSize: 10, color: "#444" }}>{b.views} views</span>
                    <span style={{ fontSize: 10, color: "#444" }}>{b.forks} forks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Prompt bar */}
          <div style={{
            padding: "14px 20px", background: "#0d0d14",
            borderBottom: "1px solid #1e1e2e", flexShrink: 0
          }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {BUILD_TYPES.map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: type === t ? `1px solid ${typeColor[t]}` : "1px solid #1e1e2e",
                  background: type === t ? typeColor[t] + "22" : "transparent",
                  color: type === t ? typeColor[t] : "#666",
                  fontWeight: type === t ? 500 : 400, transition: "all .15s",
                  fontFamily: "'DM Sans', sans-serif"
                }}>{t}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild(); }}
                  placeholder={`Describe the ${type.toLowerCase()} you want to build...`}
                  style={{
                    width: "100%", background: "#13131f", border: "1px solid #1e1e2e",
                    borderRadius: 10, padding: "10px 14px", color: "#e8e6f0",
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: "none",
                    height: 60, outline: "none", lineHeight: 1.5,
                    transition: "border .15s", boxSizing: "border-box"
                  }}
                  onFocus={e => e.target.style.borderColor = "#2a2a3e"}
                  onBlur={e => e.target.style.borderColor = "#1e1e2e"}
                />
                <div style={{ position: "absolute", right: 10, bottom: 8, fontSize: 10, color: "#333" }}>⌘↵</div>
              </div>
              <button onClick={handleBuild} disabled={isBuilding || !prompt.trim()} style={{
                padding: "0 22px", height: 60, borderRadius: 10, border: "none",
                background: isBuilding ? "#2a2a3e" : "linear-gradient(135deg, #534AB7, #7F77DD)",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: isBuilding ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", transition: "all .2s",
                minWidth: 110
              }}>
                {isBuilding ? "Building..." : "Build it →"}
              </button>
            </div>
            {/* Example prompts */}
            {!activeBuild && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {EXAMPLE_PROMPTS.slice(0, 3).map(p => (
                  <button key={p} onClick={() => setPrompt(p)} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20,
                    background: "transparent", border: "1px solid #1e1e2e",
                    color: "#555", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    transition: "all .15s"
                  }}
                    onMouseEnter={e => { e.target.style.color = "#aaa"; e.target.style.borderColor = "#2a2a3e"; }}
                    onMouseLeave={e => { e.target.style.color = "#555"; e.target.style.borderColor = "#1e1e2e"; }}>
                    {p.length > 40 ? p.slice(0, 40) + "..." : p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Workspace */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Preview/Code area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Tab bar */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 16px", borderBottom: "1px solid #1e1e2e", background: "#0d0d14",
                height: 38, flexShrink: 0
              }}>
                <div style={{ display: "flex" }}>
                  {["preview", "code"].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      background: "none", border: "none", padding: "0 14px", height: 38,
                      fontSize: 12, cursor: "pointer", color: activeTab === tab ? "#e8e6f0" : "#555",
                      borderBottom: activeTab === tab ? "2px solid #7F77DD" : "2px solid transparent",
                      fontFamily: "'DM Sans', sans-serif", fontWeight: activeTab === tab ? 500 : 400,
                      transition: "all .15s", textTransform: "capitalize"
                    }}>{tab}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {isBuilding && (
                    <span style={{ fontSize: 11, color: "#7F77DD", animation: "pulse 1s infinite" }}>
                      {buildLog}
                    </span>
                  )}
                  {activeBuild && !isBuilding && (
                    <button onClick={() => forkBuild(activeBuild)} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6,
                      background: "transparent", border: "1px solid #1e1e2e",
                      color: "#666", cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                    }}>Fork & remix</button>
                  )}
                </div>
              </div>

              {/* Preview frame */}
              {activeTab === "preview" && (
                <div style={{ flex: 1, position: "relative", background: "#060609" }}>
                  {!activeBuild && !isBuilding && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex",
                      flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16
                    }}>
                      <div style={{ fontSize: 40, opacity: 0.15 }}>⚡</div>
                      <div style={{ fontSize: 14, color: "#333", textAlign: "center", maxWidth: 300 }}>
                        Describe anything and watch it get built in seconds
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 340 }}>
                        {EXAMPLE_PROMPTS.map(p => (
                          <button key={p} onClick={() => setPrompt(p)} style={{
                            fontSize: 12, padding: "8px 14px", borderRadius: 8,
                            background: "#0d0d14", border: "1px solid #1a1a28",
                            color: "#555", cursor: "pointer", textAlign: "left",
                            fontFamily: "'DM Sans', sans-serif", transition: "all .15s"
                          }}
                            onMouseEnter={e => { e.target.style.color = "#aaa"; e.target.style.borderColor = "#2a2a3e"; }}
                            onMouseLeave={e => { e.target.style.color = "#555"; e.target.style.borderColor = "#1a1a28"; }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    style={{ width: "100%", height: "100%", border: "none", display: activeBuild || isBuilding ? "block" : "none" }}
                    title="Forge preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              )}

              {/* Code view */}
              {activeTab === "code" && (
                <div style={{ flex: 1, overflow: "auto", background: "#060609" }}>
                  {activeBuild?.html ? (
                    <pre style={{
                      padding: 20, fontSize: 11, lineHeight: 1.7, color: "#8b8ba7",
                      fontFamily: "'DM Mono', monospace", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all"
                    }}>
                      {activeBuild.html}
                    </pre>
                  ) : (
                    <div style={{ padding: 20, color: "#333", fontSize: 13 }}>
                      No code yet. Build something first.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right panel */}
            {activeBuild && (
              <div style={{
                width: 220, background: "#0d0d14", borderLeft: "1px solid #1e1e2e",
                display: "flex", flexDirection: "column", flexShrink: 0
              }}>
                <div style={{ padding: 14, borderBottom: "1px solid #1e1e2e" }}>
                  <div style={{ fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Build info</div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 20, marginBottom: 8,
                    background: (typeColor[activeBuild.type] || "#7F77DD") + "22",
                    border: `1px solid ${typeColor[activeBuild.type] || "#7F77DD"}44`
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: typeColor[activeBuild.type] || "#7F77DD" }} />
                    <span style={{ fontSize: 11, color: typeColor[activeBuild.type] || "#7F77DD", fontWeight: 500 }}>{activeBuild.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{activeBuild.prompt}</div>
                </div>

                <div style={{ padding: 14, borderBottom: "1px solid #1e1e2e" }}>
                  <div style={{ fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Stats</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[["Views", activeBuild.views], ["Forks", activeBuild.forks]].map(([label, val]) => (
                      <div key={label} style={{ background: "#13131f", borderRadius: 8, padding: "8px 10px", border: "1px solid #1a1a28" }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e6f0" }}>{val}</div>
                        <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { label: "Fork & remix", action: () => forkBuild(activeBuild) },
                      { label: "Copy HTML", action: () => navigator.clipboard.writeText(activeBuild.html || "") },
                      { label: "Iterate with AI", action: () => setPrompt("Improve this: " + activeBuild.prompt) },
                    ].map(({ label, action }) => (
                      <button key={label} onClick={action} style={{
                        width: "100%", padding: "7px 12px", borderRadius: 7,
                        background: "transparent", border: "1px solid #1e1e2e",
                        color: "#777", cursor: "pointer", fontSize: 12, textAlign: "left",
                        fontFamily: "'DM Sans', sans-serif", transition: "all .15s"
                      }}
                        onMouseEnter={e => { e.target.style.background = "#13131f"; e.target.style.color = "#bbb"; }}
                        onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#777"; }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        * { scrollbar-width: thin; scrollbar-color: #1e1e2e transparent; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 2px; }
        textarea::placeholder { color: #333; }
      `}</style>
    </div>
  );
}
