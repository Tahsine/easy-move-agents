# 🚀 Easy Move — Voice-Controlled Web Navigation Agent

**Easy Move** is a real-time voice-controlled web navigation agent powered by **Google's Gemini Live API** and the **Agent Development Kit (ADK)**. Speak naturally to your browser — Easy Move navigates, clicks, types, and scrolls for you.

> Built for the **Gemini Live Agent Challenge** hackathon.

---

## ✨ Features

- 🗣️ **Natural voice interaction** — Talk to your browser in real-time with bidirectional audio streaming
- 🌐 **Web navigation** — Navigate to any URL by simply asking
- 🖱️ **DOM interaction** — Click buttons, fill forms, scroll pages via voice commands
- 🔍 **Page understanding** — The agent reads and understands page structure before acting
- ⚡ **Interruption support** — Interrupt the agent mid-sentence, just like a real conversation
- 🎤 **Native audio** — Uses Gemini's native audio model for ultra-low latency voice responses

---

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket (audio)      ┌───────────────┐    ADK BIDI    ┌─────────────┐
│  React SidePanel │ ◄──────────────────────► │  FastAPI        │ ◄──────────► │ Gemini Live  │
│  (Chrome Ext.)   │   PCM 16kHz↑ / 24kHz↓    │  + ADK Runner   │              │ API (Google) │
└─────────────────┘                            └───────┬────────┘              └─────────────┘
                                                        │
                                               WebSocket│(/ws/extension)
                                                        │
                                     ┌──────────────────┴──────────────────┐
                                     │  background.js (Service Worker)      │
                                     │  Handles navigation & message relay  │
                                     └──────────────────┬──────────────────┘
                                                        │ chrome.runtime messages
                                     ┌──────────────────┴──────────────────┐
                                     │  content_script.js                   │
                                     │  Executes DOM actions on pages       │
                                     └─────────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **AI Model** | Gemini 2.5 Flash (Native Audio) |
| **Agent Framework** | Google ADK (Agent Development Kit) |
| **Backend** | Python, FastAPI, WebSocket |
| **Frontend** | React, Vite, TypeScript, TailwindCSS v4 |
| **Extension** | Chrome Extension (Manifest V3) |
| **Cloud** | Google Cloud Run |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Google Chrome** browser
- A **Google AI API Key** ([Get one here](https://aistudio.google.com/apikey))

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/easy-move.git
cd easy-move
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.local .env.local
# Edit .env.local and add your Google API key:
# GOOGLE_API_KEY=your_api_key_here

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8500
```

### 3. Frontend / Chrome Extension Setup

```bash
cd webapp

# Install dependencies
npm install

# Build the extension
npm run build
```

### 4. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `webapp/dist` folder
5. Click the extension icon → the **Side Panel** opens
6. Grant microphone permissions when prompted

### 5. Use Easy Move

1. Make sure the backend is running (`uvicorn main:app --port 8500`)
2. Open the Side Panel by clicking the Easy Move extension icon
3. The connection indicator turns **green** when connected
4. **Start talking!** Try: *"Go to Google"*, *"Search for weather in Paris"*, *"Click the first result"*

---

## 🛠️ Agent Tools

| Tool | Description |
|------|-------------|
| `navigate` | Navigates to a URL in the active tab |
| `click_element` | Clicks an element by CSS selector |
| `type_text` | Types text into an input field |
| `scroll` | Scrolls the page up or down |
| `get_page_context` | Reads page structure and interactive elements |
| `press_key` | Simulates a keyboard key press |

---

## 📁 Project Structure

```
easy-move/
├── backend/
│   ├── main.py                 # FastAPI server with WebSocket endpoints
│   ├── requirements.txt        # Python dependencies
│   ├── .env.local              # Environment variables (API key)
│   └── live_agents/
│       ├── agent.py            # ADK Agent definition & system prompt
│       ├── tools.py            # Browser control tools
│       └── browser_state.py    # Extension WebSocket state management
├── webapp/
│   ├── src/
│   │   ├── App.tsx             # Main React application
│   │   ├── hooks/
│   │   │   └── useLiveAgent.ts # Core hook: WebSocket, audio, state
│   │   └── components/
│   │       ├── TranscriptZone.tsx   # Live transcription display
│   │       ├── VoiceWaveform.tsx    # Audio waveform visualization
│   │       └── ControlButtons.tsx   # Mic/Screen/Web controls
│   ├── public/
│   │   ├── manifest.json           # Chrome Extension manifest
│   │   ├── background.js           # Service worker (navigation & relay)
│   │   ├── content_script.js       # DOM action executor
│   │   ├── pcm-recorder-processor.js  # Audio recording worklet (16kHz)
│   │   └── pcm-player-processor.js    # Audio playback worklet (24kHz)
│   └── package.json
└── README.md
```

---

## ☁️ Google Cloud Deployment

### Deploy to Cloud Run

```bash
cd backend

# Build and deploy
gcloud run deploy easy-move-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=your_key,DEMO_AGENT_MODEL=gemini-2.5-flash-native-audio-preview-12-2025,GOOGLE_GENAI_USE_VERTEXAI=0"
```

Then update the WebSocket URL in `webapp/src/hooks/useLiveAgent.ts` and `webapp/public/background.js` to point to your Cloud Run URL.

---

## 🏆 Hackathon

**Gemini Live Agent Challenge** — Submitted under the **UI Navigator** category.

- **Category**: UI Navigator ☸️ — Visual UI Understanding & Interaction
- **Mandatory Tech**: Gemini Live API + ADK, hosted on Google Cloud
- **Key Innovation**: Voice-first browser control with real-time bidirectional audio streaming

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.
