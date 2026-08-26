# MAHALO3 — AI-Powered SDLC Platform

MAHALO3 is a multi-persona platform that allows Product Managers, Developers, and Executives to interact with an AI agent connected to Jira, Confluence, and GitHub. It retrieves and correlates information across systems, performs actions with user approval, and presents data through role-specific dashboards.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- npm

### 1. Start Mock Services

```bash
# Terminal 1 - Mock Jira
cd mock-services/jira
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 5001

# Terminal 2 - Mock Confluence
cd mock-services/confluence
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 5002

# Terminal 3 - Mock GitHub
cd mock-services/github
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 5003
```

### 2. Start Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Access the Application

Open http://localhost:3000 in your browser.

1. **Register** — Create an account at `/register` (choose your role: Product Manager, Developer, or Executive)
2. **Login** — Sign in at `/login`
3. **Connect Integrations** — Go to Connections page and add:
   - Jira: URL `http://localhost:5001`, Token `mock-jira-token-12345`
   - Confluence: URL `http://localhost:5002`, Token `mock-confluence-token-12345`
   - GitHub: URL `http://localhost:5003`, Token `mock-github-token-12345`
4. **Dashboard** — View your role-specific dashboard with live widgets
5. **Chat** — Interact with the AI agent

## Architecture

```
Frontend (Next.js :3000)  →  Backend (FastAPI :8000)  →  Mock Services
                                    ↕                     ├── Jira (:5001)
                              SQLite + Agent              ├── Confluence (:5002)
                                    ↕                     └── GitHub (:5003)
                              OpenAI API (optional)
```

## Project Structure

```
mahalo3/
├── frontend/          # Next.js + React + Tailwind
├── backend/           # FastAPI + SQLAlchemy + LangChain
├── mock-services/
│   ├── jira/          # Mock Jira (:5001)
│   ├── confluence/    # Mock Confluence (:5002)
│   └── github/        # Mock GitHub (:5003)
├── SPEC.md            # Full project specification
├── PROGRESS.md        # Phase tracking
├── DEMO.md            # Demo scenarios
└── docker-compose.yml # Container orchestration
```

## Features

### Per Persona
- **Product Manager**: Sprint boards, velocity charts, project status, story creation
- **Executive**: Portfolio overview, key metrics, risk assessment, cross-project health
- **Developer**: Assigned stories, open PRs, recent commits, branch creation

### Agent Capabilities
- **Read**: Auto-queries Jira, Confluence, GitHub and presents correlated results
- **Write**: Proposes actions (create story, create branch) for user approval
- **Multi-system**: Single question searches across all connected systems

### Environment Variables

See `.env.example` for all configuration. Key variables:
- `OPENAI_API_KEY` — Optional. If not set, uses demo agent (keyword-based routing)
- `JWT_SECRET_KEY` — Secret for JWT token signing
- Mock service tokens default to `mock-{service}-token-12345`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| Agent | LangChain, LangGraph, OpenAI GPT-4o |
| Dashboard | react-grid-layout |
| Auth | JWT + bcrypt |
| Mock Services | FastAPI (independent services) |
