from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
from live_agent import process_audio_video_stream
from storyteller import generate_diagram
from ui_navigator import navigate_ui

app = FastAPI(title="Whiteboard Whisperer Mission Control")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "stream":
                # Handle live audio/video stream
                response = await process_audio_video_stream(data)
                await websocket.send_json(response)
            elif data.get("type") == "execute_vision":
                # Handle image generation
                image_b64 = await generate_diagram(data.get("image"))
                await websocket.send_json({"type": "diagram_generated", "image": image_b64})
                
                # Trigger UI Navigator
                await navigate_ui(websocket)
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
