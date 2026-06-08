# E-Series Storage AIQ Analyzer — Project Overview

## 1. Introduction

The **E-Series Storage AIQ Analyzer** is a web application that automates the
analysis of NetApp **E-Series STORAGE-ARRAY-PROFILE** files exported from
Active IQ (AIQ) AutoSupport logs.

Reviewing these profiles by hand is slow and error-prone: an engineer has to
scroll through large text dumps, count drive rows per shelf, distinguish base
enclosures from expansion shelves, and cross-check totals. This tool does that
work instantly and consistently, then presents a clean, structured summary plus
a downloadable PDF report.

### Business value

The analyzer was built to support the **renewal quoting** workflow for the
QS AMER and USPS teams. It helps the business:

- **Control revenue leakage** by reliably detecting expansion shelves that
  must be included in renewal quotes.
- **Speed up configuration validation** from minutes of manual reading to a
  few seconds.
- **Reduce manual effort** and the risk of transcription mistakes.
- **Improve quoting accuracy** with consistent, rule-based classification and
  built-in validation checks.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Language | **Python 3.14** | Core application language |
| Web UI | **Streamlit** (`>=1.30`) | Single-page web interface, file upload, chat, download |
| PDF generation | **reportlab** (`>=4.0`) | Builds the formatted "E-Series Storage Configuration Summary" PDF |
| PDF text extraction | **pypdf** (`>=4.0`) | Extracts text from uploaded `.pdf` profiles |
| DOCX/PPTX extraction | **zipfile + xml.etree** (standard library) | Pulls text out of Office documents without extra dependencies |
| AI / LLM | **openai** SDK (`>=1.40`) | Talks to NetApp's internal **NetAIConnect** OpenAI-compatible endpoint |
| Config / secrets | **python-dotenv** (`>=1.0`) | Loads API keys and settings from a `.env` file |
| TLS trust | **truststore** (`>=0.9`) | Uses the OS trust store so corporate/NetApp internal CAs are honored |

### Key files

| File | Role |
|------|------|
| `app.py` | The entire Streamlit application — UI, parsing logic, validation, PDF builder, and AI integration |
| `claude.py` | Thin LLM client wrapper around the OpenAI SDK, pointed at the NetAIConnect endpoint |
| `skills.md` | The functional/UX specification the analyzer is built against |
| `requirements.txt` | Python dependencies |
| `.streamlit/config.toml` | Streamlit theme configuration |
| `.env` / `.env.example` | Environment configuration (API key, base URL, model) — secrets are never hardcoded |
| `Images/` | NetApp logos and background assets used in the UI |

### LLM configuration

The LLM client (`claude.py`) reads the following from the environment / `.env`:

- `OPENAI_API_KEY` — required (falls back to `ANTHROPIC_API_KEY` for backward compatibility).
- `OPENAI_BASE_URL` — defaults to `https://netaiconnect-dev.netapp.com/v1`.
- `OPENAI_MODEL` — defaults to `gpt-5-chat`.

Because requests go through NetApp's internal NetAIConnect endpoint, uploaded
data stays within the corporate environment.

---

## 3. How the Program Works

The application follows a clear pipeline from upload to report. All core
parsing is done **locally with deterministic Python logic** — the LLM is used
only to enrich the results, never as the source of truth for the numbers.

### End-to-end flow

1. **Upload** — The user uploads a profile file. Supported formats:
   `.txt`, `.pdf`, `.docx`, `.pptx`, `.doc`, `.ppt`.
2. **Text extraction** (`extract_text`) — Text is pulled locally: direct decode
   for `.txt`, `pypdf` for PDFs, and `zipfile` + XML parsing for Office files.
3. **Validation** (`validate_storage_profile`) — Confirms the file is a genuine
   STORAGE-ARRAY-PROFILE (looks for the profile marker or both a
   "HARDWARE SUMMARY" and "DRIVES" section). Invalid files are rejected with a
   clear message.
4. **Structured analysis** (`analyze_storage_profile`) — The deterministic core:
   - `parse_hardware_summary` — extracts shelves, controllers, redundancy mode,
     total drives, media/interface types, hot spares, and battery configuration.
   - `parse_drive_rows` — parses every drive row from the DRIVES section
     (handling both drawer and non-drawer shelf layouts).
   - `summarize_shelves` — groups drives by shelf, counts them, and computes
     per-shelf and total raw capacity.
   - `parse_iom_rows` — reads the IOM section (only present when expansion
     shelves exist) for enclosure type and firmware versions.
5. **Classification** — The central business rule:
   - **Shelf 99 = Base enclosure (controller shelf)**
   - **Any other Shelf ID = Expansion shelf**
   - Result is either **"No Expansion — Base Only"** or **"Expansion Present"**.
6. **Validation checks** — The tool cross-checks the Hardware Summary drive
   count against the actual parsed drive-row count, confirms shelf
   classification from the DRIVES section, and cross-checks IOM data for
   expansion shelves. Mismatches and missing data are flagged as
   PASS / FAIL / WARNING.
7. **AI deep analysis** (`generate_deep_notes`) — The parsed summary plus the
   raw text are sent to the LLM to produce a "Deeper Analysis" narrative
   (see AI Features below).
8. **PDF generation** (`build_pdf`) — The full result is rendered into a
   branded, timestamped PDF report with styled tables and color-coded
   validation statuses.
9. **Follow-up chat** (`render_chat_panel`) — The user can ask natural-language
   questions about the uploaded file, answered strictly from its data.

### User interface

- A single-page Streamlit layout with NetApp branding (logo + cream/light
  theme defined in `.streamlit/config.toml` and custom CSS via `inject_css`).
- **Submit** button — disabled until a file is uploaded; runs the full pipeline.
- **Reset** button — clears the file, query, output, chat history, and PDF,
  returning the app to a clean state.
- **Download PDF** button — appears only after a successful analysis.
- A results area that renders the structured markdown analysis.
- A follow-up chat panel anchored to the currently uploaded file.

Application state (uploaded text, parsed summary, analysis markdown, PDF bytes,
and chat history) is held in `st.session_state` and initialized by
`init_state`.

---

## 4. AI Features

The analyzer combines deterministic parsing with two AI-powered capabilities,
both routed through NetApp's internal NetAIConnect endpoint:

### 4.1 AI Deep-Analysis Notes

After the rule-based analysis runs, `generate_deep_notes` sends the parsed
summary (as JSON) and the raw profile text to the LLM with an expert
"senior NetApp E-Series storage engineer" system prompt. The model returns a
**"Deeper Analysis (LLM)"** section appended to the report covering:

- Overall configuration health and notable strengths
- Capacity and drive distribution observations across shelves
- Redundancy, hot-spare, and battery posture
- IOM / firmware consistency across expansion shelves
- Risks, anomalies, and data points that warrant follow-up
- Recommended next checks for the operator

The prompt explicitly instructs the model **not to invent data** and to flag
anything unclear. File text is truncated to a safe context limit
(`MAX_LLM_FILE_CHARS = 120,000`).

### 4.2 Follow-up Chat

The `chat_with_file` function powers an interactive Q&A panel. Each question is
answered using **only** the uploaded file's text and the parsed summary, so
responses stay grounded in the actual data. Conversation memory is anchored to
the current file (up to `MAX_CHAT_HISTORY_TURNS = 12` turns) and is cleared on
Reset.

### Graceful degradation

If no API key is configured or the `openai` SDK is unavailable
(`claude.availability_status`), the core parsing, validation, and PDF export
still work fully — only the AI deep notes and follow-up chat are disabled, with
a clear in-app message explaining why.

---

## 5. Setup & Running

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Create a `.env` file in the project root (copy from `.env.example`) and set:
   ```env
   OPENAI_API_KEY=your-netaiconnect-key
   OPENAI_BASE_URL=https://netaiconnect-dev.netapp.com/v1
   OPENAI_MODEL=gpt-5-chat
   ```
3. Launch the app:
   ```bash
   streamlit run app.py
   ```
4. Open the app in a browser, upload a STORAGE-ARRAY-PROFILE file, and click
   **Submit**.

---

## 6. Summary

The E-Series Storage AIQ Analyzer turns tedious, manual AutoSupport profile
review into a fast, repeatable, and auditable process. Deterministic Python
parsing guarantees accurate drive counts and shelf classification, built-in
validation catches inconsistencies, and AI features add expert-level insight
and interactive Q&A — all wrapped in a simple, branded web interface with
one-click PDF reporting that directly supports the renewal quoting workflow.
