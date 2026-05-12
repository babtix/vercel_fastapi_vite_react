import React, { useState, useEffect, useRef } from "react"

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [backendOnline, setBackendOnline] = useState(false)
  const [connectionStats, setConnectionStats] = useState(null)
  const [dashboardStats, setDashboardStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    completion_rate: 0,
    category_distribution: {},
    backend_health: "0%",
    uptime: "Unknown"
  })
  
  // Tasks state
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState("Frontend")
  const [newTaskPriority, setNewTaskPriority] = useState("medium")
  const [taskLoading, setTaskLoading] = useState(false)

  // API Playground State
  const [apiLogs, setApiLogs] = useState([])
  const [terminalLoading, setTerminalLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { text: "Hello! I am your FastAPI AI Assistant. Let's test our live bridge. Ask me anything about Vercel, Vite, or FastAPI!", sender: "bot" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  
  const chatBottomRef = useRef(null)

  // Fetch status and check if backend is online
  const checkBackendStatus = async () => {
    const startTime = performance.now()
    try {
      const response = await fetch("/api/status")
      const duration = performance.now() - startTime
      if (response.ok) {
        const data = await response.json()
        setBackendOnline(true)
        setConnectionStats({
          ping: Math.round(duration),
          platform: data.platform,
          env: data.environment,
          time: data.server_time
        })
        return true
      }
    } catch (e) {
      setBackendOnline(false)
      setConnectionStats(null)
    }
    return false
  }

  // Fetch dashboard metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/stats")
      if (response.ok) {
        const data = await response.json()
        setDashboardStats(data)
      }
    } catch (e) {
      console.error("Error fetching stats:", e)
    }
  }

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (e) {
      console.error("Error fetching tasks:", e)
    }
  }

  // Trigger load of data
  const loadAllData = async () => {
    const isOnline = await checkBackendStatus()
    if (isOnline) {
      fetchMetrics()
      fetchTasks()
    }
  }

  useEffect(() => {
    loadAllData()
    // Poll backend every 6 seconds to show dynamic status metrics
    const interval = setInterval(() => {
      checkBackendStatus()
      if (backendOnline) {
        fetchMetrics()
      }
    }, 6000)
    return () => clearInterval(interval)
  }, [backendOnline])

  // Scroll chatbot to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages])

  // Add API Log helper
  const logApiRequest = (method, endpoint, status, responseData) => {
    const log = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      method,
      endpoint,
      status,
      body: JSON.stringify(responseData, null, 2)
    }
    setApiLogs(prev => [log, ...prev].slice(0, 15)) // Keep last 15 logs
  }

  // Run custom endpoint from tester
  const runEndpoint = async (method, path, body = null) => {
    setTerminalLoading(true)
    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" }
      }
      if (body) {
        options.body = JSON.stringify(body)
      }

      const startTime = performance.now()
      const response = await fetch(path, options)
      const duration = performance.now() - startTime
      
      const statusText = `${response.status} ${response.statusText}`
      let data = {}
      try {
        data = await response.json()
      } catch (e) {
        data = { message: "Empty/Non-JSON response received" }
      }

      logApiRequest(method, path, statusText, {
        ...data,
        "_latency_ms": Math.round(duration)
      })
      
      // Update stats and tasks in background if relevant
      if (path.includes("/tasks") || path.includes("/stats")) {
        fetchMetrics()
        fetchTasks()
      }
    } catch (err) {
      logApiRequest(method, path, "FAILED", { error: err.message, advice: "Ensure FastAPI server is running locally on port 8000." })
    } finally {
      setTerminalLoading(false)
    }
  }

  // Task Handlers
  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setTaskLoading(true)

    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      category: newTaskCategory,
      priority: newTaskPriority,
      createdAt: Date.now() / 1000
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      })
      if (response.ok) {
        setNewTaskTitle("")
        fetchTasks()
        fetchMetrics()
        logApiRequest("POST", "/api/tasks", "200 OK", newTask)
      } else {
        const errorData = await response.json()
        alert(`Failed to add task: ${errorData.detail || "Unknown error"}`)
      }
    } catch (err) {
      console.error(err)
      alert("Error adding task. Is backend server online?")
    } finally {
      setTaskLoading(false)
    }
  }

  const handleToggleTask = async (id) => {
    try {
      const response = await fetch(`/api/tasks/${id}/toggle`, { method: "PUT" })
      if (response.ok) {
        fetchTasks()
        fetchMetrics()
        logApiRequest("PUT", `/api/tasks/${id}/toggle`, "200 OK", { status: "success", taskId: id })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteTask = async (id) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (response.ok) {
        fetchTasks()
        fetchMetrics()
        logApiRequest("DELETE", `/api/tasks/${id}`, "200 OK", { status: "success", deletedId: id })
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Chat Submission Handler
  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMsg = chatInput
    setChatInput("")
    setChatMessages(prev => [...prev, { text: userMsg, sender: "user" }])
    setChatLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      })
      if (response.ok) {
        const data = await response.json()
        setChatMessages(prev => [...prev, { text: data.reply, sender: "bot" }])
        logApiRequest("POST", "/api/chat", "200 OK", data)
      } else {
        setChatMessages(prev => [...prev, { text: "Error from server. Backend reported failure.", sender: "bot" }])
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { text: "The FastAPI backend appears to be offline. Please make sure the server is active on port 8000.", sender: "bot" }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>AURA FULLSTACK</span>
        </div>

        <ul className="sidebar-menu">
          <li className="sidebar-item">
            <a onClick={() => setActiveTab("dashboard")} className={`sidebar-link ${activeTab === "dashboard" ? "active" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Overview
            </a>
          </li>
          <li className="sidebar-item">
            <a onClick={() => setActiveTab("tasks")} className={`sidebar-link ${activeTab === "tasks" ? "active" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Task Matrix
            </a>
          </li>
          <li className="sidebar-item">
            <a onClick={() => setActiveTab("playground")} className={`sidebar-link ${activeTab === "playground" ? "active" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              API Sandbox
            </a>
          </li>
          <li className="sidebar-item">
            <a onClick={() => setActiveTab("devops")} className={`sidebar-link ${activeTab === "devops" ? "active" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              DevOps Specs
            </a>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div>Platform: <span className="font-mono">{connectionStats?.platform || "Local Node"}</span></div>
          <div>Env: <span className="font-mono">{connectionStats?.env || "Offline"}</span></div>
          <div style={{ marginTop: "0.25rem", color: "var(--color-primary)", fontWeight: 600 }}>v1.0.0 Stable</div>
        </div>
      </aside>

      {/* VIEWPORT AREA */}
      <main className="viewport">
        {/* TOP NAVBAR STATUS */}
        <header className="navbar">
          <div>
            <h1 className="page-title">
              {activeTab === "dashboard" && "Workspace Intelligence"}
              {activeTab === "tasks" && "Task Control Board"}
              {activeTab === "playground" && "API & AI Sandbox"}
              {activeTab === "devops" && "Architectural Specs"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              {activeTab === "dashboard" && "Monitoring and metrics overview of your full-stack core."}
              {activeTab === "tasks" && "Manage persisted records synced on the FastAPI server."}
              {activeTab === "playground" && "Execute HTTP endpoints and converse with the FastAPI backend agent."}
              {activeTab === "devops" && "Monorepo routing rules and Vercel serverless configurations."}
            </p>
          </div>

          <div className={`status-badge glass`}>
            <span className={`status-indicator ${backendOnline ? "online" : "offline"}`}></span>
            <span style={{ color: backendOnline ? "var(--color-success)" : "var(--color-danger)" }}>
              {backendOnline ? `FASTAPI ONLINE` : "FASTAPI OFFLINE"}
            </span>
            {backendOnline && connectionStats && (
              <span style={{ color: "var(--text-muted)", paddingLeft: "0.5rem", borderLeft: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                {connectionStats.ping}ms
              </span>
            )}
          </div>
        </header>

        {/* BACKEND OFFLINE WARNING HEADER */}
        {!backendOnline && (
          <div className="glass-card" style={{ borderLeft: "4px solid var(--color-warning)", marginBottom: "2rem", display: "flex", gap: "1.5rem", alignItems: "center" }}>
            <div style={{ background: "rgba(245, 158, 11, 0.1)", borderRadius: "50%", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ color: "var(--color-warning)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.25rem" }}>
                Local FastAPI Server Offline
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "140%" }}>
                The React client is running, but cannot reach the backend. To enable full-stack databases, stats, and the AI agent playground, launch the Python server by opening a terminal in the root and executing:
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.6rem" }}>
                <code style={{ background: "#05050a", border: "1px solid rgba(245, 158, 11, 0.2)", padding: "0.4rem 0.8rem", color: "white", borderRadius: "4px", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
                  uvicorn api.main:app --reload
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("uvicorn api.main:app --reload");
                  }} 
                  className="btn-run-api" 
                  style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "var(--color-warning)", background: "rgba(245, 158, 11, 0.05)" }}
                >
                  Copy Command
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* STATS ROW */}
            <div className="dashboard-grid">
              <div className="glass-card">
                <div className="stat-label">System Gateway</div>
                <div className="stat-value glow-text-purple">FastAPI</div>
                <div className="stat-footer green">
                  <span className="status-indicator online"></span>
                  Serverless Core
                </div>
              </div>

              <div className="glass-card">
                <div className="stat-label">Persisted Tasks</div>
                <div className="stat-value">{dashboardStats.total_tasks}</div>
                <div className="stat-footer" style={{ color: "var(--color-secondary)" }}>
                  In api/tasks.json
                </div>
              </div>

              <div className="glass-card">
                <div className="stat-label">Completion Matrix</div>
                <div className="stat-value glow-text-blue">{dashboardStats.completion_rate}%</div>
                <div className="stat-footer" style={{ color: "var(--color-accent)" }}>
                  {dashboardStats.completed_tasks} of {dashboardStats.total_tasks} solved
                </div>
              </div>

              <div className="glass-card">
                <div className="stat-label">Gateway Integrity</div>
                <div className="stat-value glow-text-purple">{dashboardStats.backend_health}</div>
                <div className="stat-footer green">
                  Uptime: {dashboardStats.uptime}
                </div>
              </div>
            </div>

            {/* LOWER PLOT & LAYOUT */}
            <div className="main-content-layout">
              {/* CATEGORY WORKLOAD DISTRIBUTION */}
              <div className="glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
                    Category Workload Density
                  </h3>
                  <span className="badge-devops">Live DB Stats</span>
                </div>
                
                <div className="chart-container">
                  {Object.keys(dashboardStats.category_distribution).length === 0 ? (
                    <div style={{ alignSelf: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      No categorised data loaded. Create tasks in the Task Matrix!
                    </div>
                  ) : (
                    Object.entries(dashboardStats.category_distribution).map(([cat, val]) => {
                      const maxVal = Math.max(...Object.values(dashboardStats.category_distribution)) || 1
                      const pct = Math.max(10, Math.round((val / maxVal) * 100))
                      return (
                        <div key={cat} className="chart-bar-wrapper">
                          <span className="chart-bar-value">{val}</span>
                          <div className="chart-bar-track">
                            <div className="chart-bar-fill" style={{ height: `${pct}%` }}></div>
                          </div>
                          <span className="chart-bar-label">{cat}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* CORE STACK SPECS */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
                  Fullstack Node Specifications
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Vite Front Server</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600 }}>v8.0.12 (React 19)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Python Backend API</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600 }}>FastAPI (uvicorn 0.22)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>CORS Handler Router</span>
                    <span style={{ color: "var(--color-primary)", fontWeight: 600, fontSize: "0.85rem" }}>Shared Proxy Gateway</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Serverless Function</span>
                    <span style={{ color: "var(--color-accent)", fontWeight: 600, fontSize: "0.85rem" }}>Active (/api/main.py)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Deployment State</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-success)", fontWeight: 600, fontSize: "0.85rem" }}>Vercel Monorepo Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TASK MATRIX */}
        {activeTab === "tasks" && (
          <div className="glass-card tasks-section">
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Active Database Records
            </h2>
            
            {/* ADD TASK FORM */}
            <form onSubmit={handleAddTask} className="tasks-header-actions">
              <input 
                type="text" 
                placeholder="Synchronize a new database task record..." 
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="task-input"
                disabled={taskLoading || !backendOnline}
              />
              
              <select 
                value={newTaskCategory} 
                onChange={e => setNewTaskCategory(e.target.value)}
                className="task-select"
                disabled={taskLoading || !backendOnline}
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="DevOps">DevOps</option>
                <option value="General">General</option>
              </select>

              <select 
                value={newTaskPriority} 
                onChange={e => setNewTaskPriority(e.target.value)}
                className="task-select"
                disabled={taskLoading || !backendOnline}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>

              <button type="submit" className="btn-primary" disabled={taskLoading || !backendOnline}>
                {taskLoading ? "Writing..." : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Sync Task
                  </>
                )}
              </button>
            </form>

            {/* TASKS ITERATION */}
            <div className="tasks-list">
              {tasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                  {backendOnline ? "No active tasks in database. Write one above!" : "Database metrics unreachable while FastAPI is offline."}
                </div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="task-item">
                    <div className="task-item-left">
                      <label className="task-checkbox-container">
                        <input 
                          type="checkbox" 
                          checked={task.completed} 
                          onChange={() => handleToggleTask(task.id)}
                        />
                        <span className="checkmark"></span>
                      </label>
                      
                      <div>
                        <span className={`task-title ${task.completed ? "completed" : ""}`}>
                          {task.title}
                        </span>
                        <div className="task-meta">
                          <span className="tag category">{task.category}</span>
                          <span className={`tag priority-${task.priority}`}>{task.priority}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            {new Date(task.createdAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => handleDeleteTask(task.id)} className="btn-delete" title="Delete record from backend">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: API & AI SANDBOX */}
        {activeTab === "playground" && (
          <div className="api-tester-grid">
            
            {/* COLUMN 1: ROUTE TESTING & CHATBOT */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {/* ENDPOINT TRIGGERS */}
              <div className="glass-card">
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>
                  Trigger API Endpoints
                </h3>
                
                <div className="api-card">
                  <div className="api-card-details">
                    <div className="api-card-title">
                      <span className="endpoint-badge GET">GET</span>
                      System Greeting
                    </div>
                    <span className="api-card-path">/api/hello</span>
                  </div>
                  <button onClick={() => runEndpoint("GET", "/api/hello")} className="btn-run-api" disabled={terminalLoading}>
                    Execute
                  </button>
                </div>

                <div className="api-card">
                  <div className="api-card-details">
                    <div className="api-card-title">
                      <span className="endpoint-badge GET">GET</span>
                      Server Health status
                    </div>
                    <span className="api-card-path">/api/status</span>
                  </div>
                  <button onClick={() => runEndpoint("GET", "/api/status")} className="btn-run-api" disabled={terminalLoading}>
                    Execute
                  </button>
                </div>

                <div className="api-card">
                  <div className="api-card-details">
                    <div className="api-card-title">
                      <span className="endpoint-badge GET">GET</span>
                      Aggregated stats
                    </div>
                    <span className="api-card-path">/api/stats</span>
                  </div>
                  <button onClick={() => runEndpoint("GET", "/api/stats")} className="btn-run-api" disabled={terminalLoading}>
                    Execute
                  </button>
                </div>

                <div className="api-card">
                  <div className="api-card-details">
                    <div className="api-card-title">
                      <span className="endpoint-badge GET">GET</span>
                      Pull Database Tasks
                    </div>
                    <span className="api-card-path">/api/tasks</span>
                  </div>
                  <button onClick={() => runEndpoint("GET", "/api/tasks")} className="btn-run-api" disabled={terminalLoading}>
                    Execute
                  </button>
                </div>
              </div>

              {/* CHATBOT */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
                  FastAPI AI Companion
                </h3>
                
                <div className="chat-container">
                  <div className="chat-messages">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble ${msg.sender}`}>
                        {msg.text}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="chat-bubble bot" style={{ display: "flex", gap: "4px" }}>
                        <span style={{ width: "6px", height: "6px", background: "var(--color-primary)", borderRadius: "50%", animation: "pulseGlow 1s infinite alternate" }}></span>
                        <span style={{ width: "6px", height: "6px", background: "var(--color-primary)", borderRadius: "50%", animation: "pulseGlow 1s infinite alternate 0.2s" }}></span>
                        <span style={{ width: "6px", height: "6px", background: "var(--color-primary)", borderRadius: "50%", animation: "pulseGlow 1s infinite alternate 0.4s" }}></span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  
                  <form onSubmit={handleSendChat} className="chat-input-area">
                    <input 
                      type="text" 
                      placeholder="Ask the AI about routing, vercel, database..." 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="task-input"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                      disabled={chatLoading}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }} disabled={chatLoading}>
                      Send
                    </button>
                  </form>
                </div>
              </div>

            </div>

            {/* COLUMN 2: REALTIME TERMINAL RAW LOGS */}
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
                  Gateway JSON Terminal Logger
                </h3>
                <button 
                  onClick={() => setApiLogs([])} 
                  className="btn-run-api" 
                  style={{ borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--color-danger)", background: "transparent" }}
                >
                  Clear Console
                </button>
              </div>

              <div className="terminal" style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>API HTTP Stream</span>
                </div>

                <div className="terminal-body" style={{ flexGrow: 1, overflowY: "auto" }}>
                  {terminalLoading && (
                    <div className="terminal-line" style={{ color: "var(--color-primary)" }}>
                      <span className="terminal-prompt">&gt;</span> Executing fetch trigger...
                    </div>
                  )}
                  {apiLogs.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", padding: "1.5rem 0", textAlign: "center" }}>
                      &gt; No requests recorded yet. Click 'Execute' on the left endpoints or interact with the tasks to see live stream logs.
                    </div>
                  ) : (
                    apiLogs.map(log => (
                      <div key={log.id} style={{ marginBottom: "1.25rem", borderBottom: "1px dashed rgba(255,255,255,0.03)", paddingBottom: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                          <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "white" }}>
                            <span className={`endpoint-badge ${log.method}`}>{log.method}</span>
                            {log.endpoint}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            [{log.time}] Status: <span style={{ color: log.status.includes("200") ? "var(--color-success)" : "var(--color-danger)" }}>{log.status}</span>
                          </span>
                        </div>
                        <pre style={{ margin: 0, padding: "0.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "4px", color: "#a5b4fc", fontSize: "0.8rem", overflowX: "auto" }}>
                          {log.body}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: DEVOPS ARCHITECTURE VIEWER */}
        {activeTab === "devops" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* WORKFLOW PATHING */}
            <div className="glass-card">
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
                Monorepo Gateway & Proxy Routing Graph
              </h3>
              
              <div style={{ padding: "1rem", background: "#05050a", borderRadius: "12px", border: "1px solid rgba(139, 92, 246, 0.1)" }}>
                <pre style={{ margin: 0, color: "var(--color-accent)", fontSize: "0.85rem", overflowX: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", lineHeight: "160%" }}>
{`                              ┌──────────────────────────────────────────────┐
                              │            Client Web Browser                │
                              └──────────────────────┬───────────────────────┘
                                                     │
                                                     │  Any request path
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │            Vercel Edge Network               │
                              └──────────────────────┬───────────────────────┘
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             │ vercel.json rewrites config                   │
                             ▼                                               ▼
               Matched: "/api/(.*)"                            Matched: "/(.*)" (All else)
              [Routes to Python Srvless]                     [Routes to Built React SPA Assets]
                             │                                               │
                             ▼                                               ▼
         ┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
         │       /api/main.py (FastAPI)         │        │         /index.html (Vite SPA)       │
         └──────────────────────────────────────┘        └──────────────────────────────────────┘`}
                </pre>
              </div>
            </div>

            {/* SPECS INFORMATION LISTS */}
            <div className="api-tester-grid">
              
              {/* CONFIGS SUMMARY */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
                  Key Configurations
                </h3>

                <div className="architecture-list">
                  <div className="arch-step">
                    <span className="arch-num">1</span>
                    <div className="arch-info">
                      <span className="arch-title">Vercel Routers (vercel.json)</span>
                      <p className="arch-desc">Configures serverless rewrite directives. This directs any requests beginning with <code style={{ fontSize: "0.75rem" }}>/api/</code> straight to the serverless interpreter loading <code style={{ fontSize: "0.75rem" }}>api/main.py</code>.</p>
                      <span className="badge-devops">Root Path</span>
                    </div>
                  </div>

                  <div className="arch-step">
                    <span className="arch-num">2</span>
                    <div className="arch-info">
                      <span className="arch-title">Local Dev Proxy (vite.config.js)</span>
                      <p className="arch-desc">To bypass Cross-Origin Resource Sharing (CORS) rules in local environments, Vite proxies requests originating from the frontend at <code style={{ fontSize: "0.75rem" }}>/api/*</code> to port <code style={{ fontSize: "0.75rem" }}>8000</code> where Python is listening.</p>
                      <span className="badge-devops">Local Parity</span>
                    </div>
                  </div>

                  <div className="arch-step">
                    <span className="arch-num">3</span>
                    <div className="arch-info">
                      <span className="arch-title">Python serverless container (api/main.py)</span>
                      <p className="arch-desc">FastAPI runs inside the serverless function sandbox. Requirements listed in <code style={{ fontSize: "0.75rem" }}>requirements.txt</code> are dynamically instantiated during production cold starts.</p>
                      <span className="badge-devops">Backend Engine</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILS AND BEST PRACTICES */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
                  Production & Cold-start Notes
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem", lineHeight: "150%" }}>
                  <div style={{ background: "rgba(139, 92, 246, 0.04)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "8px", padding: "1rem" }}>
                    <strong style={{ color: "var(--color-primary)", display: "block", marginBottom: "0.3rem", fontSize: "0.95rem" }}>🚀 Cold Starts</strong>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Because the FastAPI app runs on demand inside a serverless lambda function, if there have been no requests for a while, the next fetch might require a 2-3 second "warm up" delay as Vercel provisions the Python runtime environment.
                    </p>
                  </div>

                  <div style={{ background: "rgba(20, 184, 166, 0.04)", border: "1px solid rgba(20, 184, 166, 0.15)", borderRadius: "8px", padding: "1rem" }}>
                    <strong style={{ color: "var(--color-accent)", display: "block", marginBottom: "0.3rem", fontSize: "0.95rem" }}>🛡️ CORS in Production</strong>
                    <p style={{ color: "var(--text-secondary)" }}>
                      In production, because both the React frontend and Python serverless endpoints reside on the exact same domain, there are no CORS requirements at all! The vercel.json routing naturally prevents cross-origin obstacles.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  )
}
