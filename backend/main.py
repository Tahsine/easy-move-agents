import asyncio
import base64
import json
import logging
import warnings
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment variables from .env file BEFORE importing agent
load_dotenv(Path(__file__).parent / ".env.local")

# Import agent after loading environment variables
# pylint: disable=wrong-import-position
from live_agents.agent import root_agent  # noqa: E402
from live_agents import browser_state  # noqa: E402

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress Pydantic serialization warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# Application name constant
APP_NAME = "live-agent-demo"

# ========================================
# Phase 1: Application Initialization (once at startup)
# ========================================

app = FastAPI()

# Define your session service
session_service = InMemorySessionService()

# Define your runner
runner = Runner(app_name=APP_NAME, agent=root_agent, session_service=session_service)

# ========================================
# Extension Connection
# ========================================


@app.websocket("/ws/extension")
async def extension_endpoint(websocket: WebSocket) -> None:
    """Endpoint for the Chrome extension to connect to."""
    await websocket.accept()
    browser_state.active_extensions.add(websocket)
    logger.info(f"✅ Extension connectée. (Total: {len(browser_state.active_extensions)})")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "heartbeat":
                    continue

                # If it's a result for a pending Python request (navigate, get_context, etc.)
                req_id = msg.get("request_id")
                if req_id and req_id in browser_state.pending_requests:
                    future = browser_state.pending_requests.get(req_id)
                    if future and not future.done():
                        future.set_result(msg)

                logger.debug(f"📩 Reçu de l'extension: {msg.get('type', 'unknown') or msg.get('tool', 'unknown')}")
            except Exception:
                logger.debug(f"📩 Reçu de l'extension (raw): {data[:100]}")
    except WebSocketDisconnect:
        logger.debug("❌ Extension déconnectée proprement")
    except Exception as e:
        logger.error(f"❌ Erreur WebSocket Extension: {e}")
    finally:
        browser_state.active_extensions.discard(websocket)
        logger.debug(f"❌ Extension déconnectée. (Restant: {len(browser_state.active_extensions)})")


# ========================================
# WebSocket Endpoint (React Client)
# ========================================


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
    proactivity: bool = False,
    affective_dialog: bool = False,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK."""
    logger.debug(f"React connection: user_id={user_id}, session_id={session_id}")
    await websocket.accept()

    # Determine modalities based on model type
    model_name = root_agent.model
    is_native_audio = "native-audio" in model_name.lower()

    if is_native_audio:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            proactivity=(
                types.ProactivityConfig(proactive_audio=True) if proactivity else None
            ),
            enable_affective_dialog=affective_dialog if affective_dialog else None,
        )
    else:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["TEXT"],
        )

    # Get or create session
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )

    live_request_queue = LiveRequestQueue()

    # ========================================
    # Phase 3: Active Session (concurrent bidirectional communication)
    # ========================================

    async def upstream_task() -> None:
        """Receives messages from WebSocket and sends to LiveRequestQueue."""
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                audio_blob = types.Blob(
                    mime_type="audio/pcm;rate=16000", data=message["bytes"]
                )
                live_request_queue.send_realtime(audio_blob)

            elif "text" in message:
                json_message = json.loads(message["text"])

                if json_message.get("type") == "text":
                    content = types.Content(
                        parts=[types.Part(text=json_message["text"])]
                    )
                    live_request_queue.send_content(content)
                elif json_message.get("type") == "interrupt":
                    live_request_queue.interrupt()
                elif json_message.get("type") == "image":
                    image_data = base64.b64decode(json_message["data"])
                    mime_type = json_message.get("mimeType", "image/jpeg")
                    image_blob = types.Blob(mime_type=mime_type, data=image_data)
                    live_request_queue.send_realtime(image_blob)

    async def downstream_task() -> None:
        """Receives Events from run_live() and sends to WebSocket."""
        async for event in runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            await websocket.send_text(
                event.model_dump_json(exclude_none=True, by_alias=True)
            )

    try:
        await asyncio.gather(upstream_task(), downstream_task())
    except WebSocketDisconnect:
        logger.debug("Client disconnected normally")
    except Exception as e:
        logger.error(f"Unexpected error in streaming tasks: {e}", exc_info=True)
    finally:
        live_request_queue.close()
        logger.info(f"React session {session_id} finished.")