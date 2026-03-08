# browser_state.py
from typing import Set, Dict
from fastapi import WebSocket
import asyncio
import uuid
import logging

logger = logging.getLogger(__name__)

# Store all active extension connections
active_extensions: Set[WebSocket] = set()

# Store pending requests from Python to the extension
pending_requests: Dict[str, asyncio.Future] = {}

def get_ws() -> WebSocket | None:
    """Returns the most recent active WebSocket connection, filtering out closed ones."""
    global active_extensions
    # Filter out connections that might have closed without triggering finally block yet
    active_extensions = {ws for ws in active_extensions if ws.client_state.value == 1} # 1 = CONNECTED
    
    if not active_extensions:
        return None
    return list(active_extensions)[-1]

async def send_request(tool_name: str, payload: dict, timeout: int = 20) -> dict:
    """
    Sends a request to the extension and WAITS for a response.
    """
    ws = get_ws()
    if not ws:
        logger.error("❌ Tentative d'outil alors que l'extension est déconnectée")
        return {"status": "error", "error": f"L'extension Chrome n'est pas connectée. Ouvre une page web (ex: Google) ou vérifie qu'elle est bien activée."}

    request_id = str(uuid.uuid4())
    payload["request_id"] = request_id
    payload["tool"] = tool_name

    future = asyncio.get_running_loop().create_future()
    pending_requests[request_id] = future

    try:
        logger.debug(f"📤 Envoi requête extension: {tool_name} (ID: {request_id})")
        await ws.send_json(payload)
        # Wait for the response from the extension
        result = await asyncio.wait_for(future, timeout=timeout)
        logger.debug(f"📥 Réponse extension reçue pour {tool_name}")
        return result
    except asyncio.TimeoutError:
        logger.warning(f"⏰ Timeout pour l'outil: {tool_name}")
        return {"status": "error", "error": f"Délai d'attente dépassé pour {tool_name}. Vérifie que l'onglet est toujours actif."}
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'appel outil {tool_name}: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        if request_id in pending_requests:
            del pending_requests[request_id]
