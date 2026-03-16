<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run app.

View your app in AI Studio

Testing URL: https://ai.studio/apps/356532b9-a51f-4c11-aba2-608e0d47e242

# Whiteboard Whisperer

Whiteboard Whisperer is a next-generation multimodal AI agent that bridges the gap between physical brainstorming and digital execution. It observes physical whiteboard sketches via a live webcam feed, transforms them into 4K architectural diagrams using Gemini 3 Pro Image (Nano Banana Pro) , and autonomously creates Jira development tickets using the Gemini 2.5 Computer Use model. 

## prerequisites

Before you begin, ensure you have the following installed and configured:
*   **Python 3.10+**
*   **Google Cloud CLI (`gcloud`)** installed and authenticated
*   **Gemini API Key** from Google AI Studio

## Option 1: The "Antigravity" Build (Recommended)
This project was designed to be generated and deployed using **Google AI Studio's Antigravity** platform. If you want to bypass local deployment issues:
1. Navigate to Google AI Studio and open the **Build** environment.
2. Copy the "Mega-Prompt" from this repository's documentation.
3. Paste it into the Antigravity chat. The agent will automatically scaffold the backend (FastAPI), frontend (Vanilla JS/Tailwind), and handle the deployment directly to Google Cloud Run!

//MEGA PROMPT:
System Objective: You are an expert AI developer building an advanced multimodal agentic application called "Whiteboard Whisperer". You will generate the full repository structure, backend services, and an awesome, highly professional frontend UI using FastAPI and Vanilla JavaScript. The app requires low-latency WebSockets, raw audio/video processing, image generation, and autonomous UI navigation.
Repository Structure Required: Create a clean separation of concerns, mirroring successful multimodal architectures like the Immergo application 
.
whiteboard-whisperer/
├── Dockerfile
├── requirements.txt
├── backend/
│   ├── main.py
│   ├── live_agent.py
│   ├── storyteller.py
│   └── ui_navigator.py
└── frontend/
    ├── index.html
    └── app.js
Technology Stack & Aesthetics:
Frontend: Use Vanilla HTML5, JavaScript, and Tailwind CSS to ensure a lightweight, low-latency interface capable of handling full-duplex WebSockets without heavy framework overhead 
. The UI must feature a highly professional "Mission Control" aesthetic: use dark-mode, neon-cyan styling, glassmorphic panels, and a splash screen heading that pulses with a holographic glow 
. Do not use React or Streamlit.
Backend: Python 3.10+ with FastAPI and Uvicorn. Follow the "Mission Control" pattern, using a centralized API that manages state, identity, and event validation across the distributed network of agents 
.
Authentication: Use python-dotenv to securely load the GEMINI_API_KEY (Note: this is a standard developer practice).
Deployment: The Dockerfile must use mcr.microsoft.com/playwright/python:v1.40.0-jammy so Chromium binaries are available for the Computer Use agent. Expose port 8080.
Core Workflows to Implement:
Workflow 1: Mission Control & Live API (WebSockets)
Create a stateful WebSocket (WSS) endpoint (/ws) in main.py 
.
The frontend (app.js) must continuously capture webcam video at 1 Frame Per Second (Base64 JPEG) and raw microphone audio (16kHz PCM) 
.
In live_agent.py, use the gemini-2.5-flash-native-audio model to process this stream bidirectionally, returning 24kHz audio output 
.
Workflow 2: The "Make This Real" Trigger (Nano Banana Pro)
The frontend must feature a prominent, glassmorphic "MAKE THIS REAL" button 
. When clicked, it sends an execute_vision command with the latest video frame over the WebSocket.
In storyteller.py, trigger the gemini-3-pro-image-preview (Nano Banana Pro) model 
. Instruct it to act as a creative director and generate a 16:9 4K architectural diagram based on the frame 
. Return the Base64 image bytes to the frontend to display on an interactive canvas.
Workflow 3: Autonomous UI Navigation (Computer Use)
After the diagram is generated, trigger ui_navigator.py.
Use the gemini-2.5-computer-use-preview-10-2025 model alongside Playwright to autonomously navigate Jira 
.
MANDATORY HITL (Human-in-the-loop): Because autonomous UI control involves inherent risks, you must implement a strict per-step safety service 
. If the model proposes an action classified as require_confirmation, pause execution and send a "HITL_REQUIRED" status to the frontend 
. The frontend must display a bold warning modal asking the user to approve or abort before proceeding 
.
Output Requirements: Generate the complete, working code for all files listed in the repository structure. Ensure all dependencies in requirements.txt are strictly pinned.//

## 💻 Option 2: Local Development Setup

If you prefer to run the project on your local machine for testing:

1. Clone the repository

```bash

git clone https://github.com/YOUR_USERNAME/whiteboard-whisperer.git
cd whiteboard-whisperer

2. Set up your environment variables Create a .env file in the root directory and securely add your API key:
GEMINI_API_KEY="your_api_key_here"

3. Create a virtual environment and install dependencies
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install --no-cache-dir -r requirements.txt

4. Install Playwright Chromium binaries Because the Gemini 2.5 Computer Use agent needs a browser to navigate Jira, you must install the headless Chromium binaries:
playwright install chromium

5. Start the Mission Control Server
uvicorn backend.main:app --host 0.0.0.0 --port 8080
Open your browser and navigate to http://localhost:8080 to view the UI.

**☁️ Option 3: Google Cloud Run Deployment**
This repository includes a Dockerfile pre-configured with the Microsoft Playwright base image to ensure the Computer Use agent has the correct environment. It also includes a .gcloudignore file to prevent your local venv from uploading.

To deploy directly to Google Cloud Run:
# Submit the build to Google Cloud Build
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/whisperer-repo/whisperer-app
(Remember to replace YOUR_PROJECT_ID with your actual Google Cloud project ID).

🗂️ Repository Structure
whiteboard-whisperer/
├── .env                        # Environment variables (Ignored by Git)
├── .gitignore                  # Git whitelist
├── .gcloudignore               # Cloud Build whitelist
├── Dockerfile                  # Multi-stage container recipe
├── requirements.txt            # Strictly pinned Python dependencies
├── backend/
│   ├── main.py                 # FastAPI Mission Control & WebSocket router
│   ├── live_agent.py           # Gemini 2.5 Flash Live API streaming logic
│   ├── storyteller.py          # Gemini 3 Pro Image (Nano Banana Pro) logic
│   └── ui_navigator.py         # Gemini 2.5 Computer Use Vision-Action loop
└── frontend/
    ├── index.html              # Vanilla HTML5 UI
    └── app.js                  # WebRTC and Web Audio API logic


🔒 Enterprise Safety (HITL)
Autonomous UI control involves inherent risks
. This application implements a strict Human-in-the-Loop (HITL) architecture. If the Computer Use model proposes an action classified as require_confirmation, execution pauses and demands explicit user approval before clicking or typing inside the Jira workspace
