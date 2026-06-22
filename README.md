# Collaborative Multi-Agent AI Travel Orchestrated Planner

A production-grade, full-stack travel orchestration platform that leverages a **Collaborative Multi-Agent Architecture** in conjunction with the **Google Maps Platform** and **Gemini Flash models**. 

This repository showcases advanced AI engineering, robust error handling, structured JSON schemas, and automated transit post-processing loops designed to simulate a real-world software product.

---

## 🏗️ System Architecture

Rather than executing a single, generic LLM prompt, the platform orchestrates a collaborative network of **four specialized, concurrent AI agents** working in parallel to plan, budget, navigate, and curate the travel itinerary.

```
                  ┌───────────────────────────────┐
                  │      User Inputs & Dates      │
                  └───────────────┬───────────────┘
                                  ▼
             ┌─────────────────────────────────────────┐
             │  Unified Multi-Agent LLM Orchestrator   │
             └──────┬─────────────┬─────────────┬──────┘
                    │             │             │
      ┌─────────────▼─────┐       │       ┌─────▼─────────────┐
      │  Planning Agent   │       │       │    Budget Agent   │
      │ • Route structure │       │       │ • Cost breakdown  │
      │ • Airport limits  │       │       │ • Currency stats  │
      └───────────────────┘       ▼       └───────────────────┘
                            ┌─────────────┐
                            │ Food Agent  │
                            │ • Local eats│
                            │ • Landmarks │
                            └─────────────┘
                                  ▲
       ┌──────────────────────────┴──────────────────────────┐
       │                 Transportation Agent                │
       │ • Commute routing, mode Selection, buffer handling  │
       └──────────────────────────┬──────────────────────────┘
                                  ▼
             ┌─────────────────────────────────────────┐
             │        Structured JSON Validator        │
             └────────────────────┬────────────────────┘
                                  ▼
             ┌─────────────────────────────────────────┐
             │    Post-Processing Pipeline (Real Maps) │
             │ • Google Maps Matrix API querying       │
             │ • Automatic overlap shifting (padding)   │
             │ • Elegant fallback heuristic solver     │
             └────────────────────┬────────────────────┘
                                  ▼
             ┌─────────────────────────────────────────┐
             │       Interactive React UI / Map        │
             └─────────────────────────────────────────┘
```

### 1. The Collaborative Specialty Advisors
The core backend (`/server.ts`) runs an express gateway prompting Gemini with separate system personas, constraints, and instructions, outputting a strictly compiled single-spec payload:
*   **Planner Agent**: Designs geographic grouping, manages check-in constraints, and enforces flight arrival/departure boundaries (preventing scheduled activities from overlapping travel times).
*   **Budget Agent**: Estimates expenses dynamically in local currency, matches user limits, and raises warnings for financial overflows.
*   **Transport Agent**: Computes path distances and routes commute times (walking, subways, taxis).
*   **Food Agent**: Recommends real-world local culinary businesses, street eats, and highly-rated establishments instead of generic placeholders.

### 2. Physical Limits & Transit Post-Processing
To guarantee that the planner is realistic, the backend subjects the initial LLM plan to a **deterministic post-processing pipeline**:
*   **Real-time Distance Matrix Validation**: The system queries the Google Maps API using origins/destinations to retrieve official travel durations.
*   **Self-Healing Overlap Handler**: If the physical travel duration is longer than the schedule gap, the pipeline executes a propagation algorithm—automatically shifting subsequent activities forward and injecting safe 15-minute buffers.
*   **Graceful API Fallbacks**: If the Google Maps API key is missing or unbilled, the system falls back on a pre-trained geometric calculation matrix, ensuring 100% uptime without breaking the application.

---

## 🛠️ Production-Grade Automation & Engineering Highlights

For interviewers reviewing this repository, the codebase utilizes several production-ready patterns:

*   **Self-Healing API Resilience Wrapper**: The backend wraps all LLM calls in a retry algorithm with exponential backoff. It detects transient network issues, 503 model-busy states, and quota rate limits (429s), resolving them without user-facing failures.
*   **Strict JSON Schema Guarantees**: Leverages Gemini's structured output config (`responseSchema`), forcing the model to adhere perfectly to typing structures, eliminating structural parser crashes.
*   **Lazy SDK Initialization**: Prevents runtime startup crashes on servers when environment configurations are missing, allowing modules to run in sandboxed or local profiles safely.
*   **Isomorphic UI Rendering**: Renders standard Markdown structures with safety escaping using a fully customized `react-markdown` setup integrated with Tailwind CSS layouts.
*   **Vite Single-Port Reverse Proxy**: Bundles and serves the entire full-stack application as a single Node container through an Express-Vite middleware, eliminating complex CORS-handshake setups on cloud configurations.

---

## 🚀 Tech Stack

-   **Frontend**: React 18, Tailwind CSS, Lucide Icons, Framer Motion, customized `react-markdown` typography.
-   **Backend**: Node.js, Express, TypeScript, `@google/genai` (SDK for Gemini).
-   **APIs**: Google Maps Platform (Autocomplete & Distance Matrix).
-   **Bundling & CI**: Vite, `esbuild` (bundling TypeScript backend to high-performance CJS), `tsc`.

---

## 💻 Local Setup & Execution Guide

To run this project on your local workstation, proceed with the following steps:

### Prerequisites
- Node.js (v18 or higher)
- NPM

### 1. Clone & Install Dependencies
```bash
git clone <your-exported-github-repo-url>
cd <repo-name>
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file at the root of the project:
```env
# Gemini API Key for driving the multi-agent travel model
GEMINI_API_KEY=your-gemini-api-key

# Optional: Google Maps Key for precise transit calculations & autocompletes
GOOGLE_MAPS_PLATFORM_KEY=your-google-maps-api-key
```

### 3. Run in Development Mode
Starts the concurrent Express & React development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

### 4. Production Compilation & Launch
To verify the production build chain, run:
```bash
# Compiles both Frontend static files and the bundled backend
npm run build

# Runs the compiled bundle in standard production mode
npm run start
```

---

## 🤖 Continuous Integration (CI)
This repository includes a pre-configured GitHub Actions workflow in `.github/workflows/ci.yml`. On every pull request or merge to `main`, the workflow automates:
1. File linting verification (`npm run lint`).
2. Absolute production build compilation tests (`npm run build`).

 This ensures the code always builds clean and is deployment-ready, reflecting excellent development hygiene!
