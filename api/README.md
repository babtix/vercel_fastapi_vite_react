# Backend Setup Guide

This directory contains the **FastAPI** backend for the Multi-IA Consultant application.

## Prerequisites

- **Python** 3.11 or higher
- **MongoDB** running locally (or accessible via connection string)
- **Ollama** installed and running (default: `http://localhost:11434`)
- *(Optional)* **LM Studio** running if you plan to use it as a provider

## Local Setup

### 1. Create a Virtual Environment

It is strongly recommended to use a virtual environment to isolate project dependencies.

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment named .venv
python -m venv .venv

# Activate it
# On Windows:
.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate
```

### 2. Install Dependencies

With the virtual environment activated, install the required packages:

```bash
pip install -r requirements.txt
```

The `requirements.txt` includes core frameworks such as **FastAPI**, **Uvicorn**, **Motor** (async MongoDB driver), **Pydantic**, and optional integrations like **Ollama**, **ChromaDB**, and **LM Studio**.

### 3. Configure Environment Variables

The application reads configuration from a `.env` file located **inside this `backend/` directory**.

Create a `.env` file:

```bash
cp .env.example .env   # (if an example exists)
# OR create it manually:
touch .env
```

Add the following required variables:

```env
# Security — MUST be set to a strong secret for JWT signing
SECRET_KEY=your_super_secret_key_change_me_in_production

# MongoDB connection
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=multiia_db

# LLM Provider defaults
DEFAULT_LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
LMSTUDIO_BASE_URL=http://localhost:1234

# CORS origins (comma-separated if provided as a string)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

> **Important:** `SECRET_KEY` is mandatory. The application will fail to start if it is missing.

### 4. Verify the Installation

Run the tests to ensure everything is wired correctly:

```bash
pytest backend/test/
```

### 5. Run the Development Server

Start the FastAPI application with auto-reload:

```bash
uvicorn main:app --host 0.0.0.0 --port 8008 --reload
```

Or use the built-in entry point:

```bash
python main.py
```

The API will be available at `http://localhost:8008`.

---

## Docker (Optional)

A `Dockerfile` is provided for containerized deployment:

```bash
docker build -t multiia-backend .
docker run -p 8008:8008 --env-file .env multiia-backend
```

## API Usage Guide

Once the server is running, you can interact with the API in several ways.

### Starting the Server

The recommended way to run the backend during development is with **Uvicorn**:

```bash
uvicorn main:app --host 0.0.0.0 --port 8008 --reload
```

- `--host 0.0.0.0` makes the server accessible from other machines on the network.
- `--port 8008` binds to port 8008 (configurable).
- `--reload` automatically restarts the server when source files change.

For production, omit `--reload` and consider using a process manager such as **Gunicorn** with Uvicorn workers:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8008
```

### Interactive API Documentation (Swagger UI)

FastAPI automatically generates interactive documentation based on your route definitions, Pydantic models, and type hints.

Open your browser and navigate to:

```
http://localhost:8008/docs
```

From the Swagger UI you can:

- Browse all available endpoints grouped by tags (Auth, Agents, Conversations, RAG, Settings, Research, Tools).
- Inspect request schemas, query parameters, and response models.
- Execute requests directly in the browser using the **"Try it out"** button.
- Authorize requests by clicking the **Authorize** button and entering a valid JWT Bearer token obtained from `/auth/login`.

### Alternative Documentation (ReDoc)

A static, redoc-style reference is also available at:

```
http://localhost:8008/redoc
```

### Health Check

Verify that the API is alive by visiting the root endpoint:

```bash
curl http://localhost:8008/
```

Expected response:

```json
{"message": "Welcome to Multi-IA Consultant API"}
```

## Troubleshooting

| Issue | Resolution |
|---|---|
| `ModuleNotFoundError` | Ensure the virtual environment is activated and dependencies are installed. |
| `SECRET_KEY` missing | Create the `.env` file and set a strong `SECRET_KEY`. |
| MongoDB connection errors | Verify MongoDB is running and `MONGODB_URL` points to the correct host. |
| CORS errors from frontend | Add your frontend origin to `CORS_ORIGINS` in `.env`. |
