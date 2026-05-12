import os
import json
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Vercel FastAPI React Backend")

# In production (Vercel), CORS is handled by sharing the same domain via rewrites,
# but for local dev and flexibility we add standard CORS middleware.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local data persistence for tasks
TASKS_FILE = os.path.join(os.path.dirname(__file__), "tasks.json")

class Task(BaseModel):
    id: str
    title: str
    completed: bool = False
    category: str = "General"
    priority: str = "medium"  # low, medium, high
    createdAt: float

class ChatMessage(BaseModel):
    message: str

def load_tasks() -> List[dict]:
    if os.path.exists(TASKS_FILE):
        try:
            with open(TASKS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    
    # Default preloaded tasks if file doesn't exist or is corrupted
    default_tasks = [
        {
            "id": "1",
            "title": "Set up FastAPI backend structures",
            "completed": True,
            "category": "Backend",
            "priority": "high",
            "createdAt": time.time() - 3600 * 2
        },
        {
            "id": "2",
            "title": "Build stunning dark-mode Glassmorphism dashboard",
            "completed": False,
            "category": "Frontend",
            "priority": "high",
            "createdAt": time.time() - 1800
        },
        {
            "id": "3",
            "title": "Configure vercel.json routing configuration",
            "completed": True,
            "category": "DevOps",
            "priority": "medium",
            "createdAt": time.time() - 3600 * 4
        },
        {
            "id": "4",
            "title": "Add local development CORS proxy configuration",
            "completed": False,
            "category": "DevOps",
            "priority": "low",
            "createdAt": time.time() - 1200
        }
    ]
    save_tasks(default_tasks)
    return default_tasks

def save_tasks(tasks: List[dict]):
    try:
        with open(TASKS_FILE, "w") as f:
            json.dump(tasks, f, indent=2)
    except Exception as e:
        print(f"Error saving tasks: {e}")

@app.get("/api/hello")
async def hello():
    return {
        "status": "success",
        "message": "Hello from FastAPI on Vercel!",
        "timestamp": time.time(),
        "environment": "Vercel Serverless Function" if os.environ.get("VERCEL") else "Local Development"
    }

@app.get("/api/status")
async def get_status():
    uptime = time.time() - app.state.start_time if hasattr(app.state, "start_time") else 0
    return {
        "status": "online",
        "api_version": "1.0.0",
        "uptime_seconds": round(uptime, 2),
        "environment": "Vercel Serverless Function" if os.environ.get("VERCEL") else "Local Development",
        "server_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "platform": "Vercel" if os.environ.get("VERCEL") else "Windows / Local"
    }

# App initialization setup
@app.on_event("startup")
async def startup_event():
    app.state.start_time = time.time()

@app.get("/api/tasks", response_model=List[Task])
async def get_tasks():
    return load_tasks()

@app.post("/api/tasks", response_model=Task)
async def create_task(task: Task):
    tasks = load_tasks()
    # Check if id already exists
    if any(t["id"] == task.id for t in tasks):
        raise HTTPException(status_code=400, detail="Task ID already exists")
    
    tasks.append(task.model_dump())
    save_tasks(tasks)
    return task

@app.put("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: str):
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            t["completed"] = not t["completed"]
            save_tasks(tasks)
            return {"status": "success", "task": t}
    raise HTTPException(status_code=404, detail="Task not found")

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    tasks = load_tasks()
    filtered_tasks = [t for t in tasks if t["id"] != task_id]
    if len(filtered_tasks) == len(tasks):
        raise HTTPException(status_code=404, detail="Task not found")
    save_tasks(filtered_tasks)
    return {"status": "success", "message": f"Task {task_id} deleted"}

@app.get("/api/stats")
async def get_stats():
    tasks = load_tasks()
    total = len(tasks)
    completed = sum(1 for t in tasks if t["completed"])
    pending = total - completed
    categories = {}
    for t in tasks:
        cat = t.get("category", "General")
        categories[cat] = categories.get(cat, 0) + 1
        
    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 1),
        "category_distribution": categories,
        "backend_health": "100%",
        "uptime": "Healthy"
    }

@app.post("/api/chat")
async def chatbot(payload: ChatMessage):
    msg = payload.message.lower()
    
    # Generate some smart backend-oriented agent responses
    if "hello" in msg or "hi" in msg:
        reply = "Hello there! I am the FastAPI + React Agent. How can I assist you with your fullstack deployment dashboard today?"
    elif "vercel" in msg:
        reply = "Vercel deploys our FastAPI backend inside the '/api' directory as a serverless function! Any requests matching '/api/*' are automatically routed to 'api/main.py' via our 'vercel.json' configuration."
    elif "vite" in msg or "react" in msg:
        reply = "Vite serves as our fast frontend tool. It proxies backend calls to our Python local server on port 8000 during local development, so you don't face any CORS errors!"
    elif "task" in msg or "todo" in msg:
        reply = "You can manage task records easily. They are synced instantly to the Python backend and persisted locally in 'api/tasks.json'!"
    elif "database" in msg or "store" in msg:
        reply = "Currently, tasks are stored in a local 'tasks.json' database on the backend server, simulating a persistent database state."
    else:
        reply = "That's very interesting! As your FastAPI companion, I can confirm our full-stack bridge is running smoothly. Feel free to add tasks, test endpoints, or browse the Vercel architecture specs!"
        
    return {
        "reply": reply,
        "sender": "FastAPI Agent",
        "timestamp": time.time()
    }
