/**
 * background.js
 * Gère la connexion WebSocket et le routage des messages.
 */

console.log("[Background] Service Worker démarré");

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

let ws = null;
let reconnectTimeout = null;

function connectToBackend() {
    if (ws) return;
    console.log("[Background] Tentative de connexion au backend...");
    ws = new WebSocket("ws://127.0.0.1:8500/ws/extension");

    ws.onopen = () => {
        console.log("[Background] ✅ Connecté au backend");
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        ws.send(JSON.stringify({ type: "connection_init", timestamp: Date.now() }));
    };

    ws.onclose = (event) => {
        console.log(`[Background] ❌ Déconnecté (Code: ${event.code}). Retry dans 2s...`);
        ws = null;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectToBackend, 2000);
    };

    ws.onerror = (err) => {
        console.error("[Background] Erreur WebSocket:", err);
    };

    ws.onmessage = async (event) => {
        try {
            const message = JSON.parse(event.data);
            const { tool, request_id } = message;

            if (tool === "navigate") {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                    console.log("[Background] Navigation vers:", message.url);
                    await chrome.tabs.update(tab.id, { url: message.url });

                    let responded = false;
                    const listener = (tabId, info) => {
                        if (tabId === tab.id && info.status === 'complete' && !responded) {
                            responded = true;
                            chrome.tabs.onUpdated.removeListener(listener);
                            console.log("[Background] Navigation terminée");
                            ws.send(JSON.stringify({
                                type: "result",
                                request_id,
                                status: "success",
                                url: message.url
                            }));
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                    // Timeout fallback: if page never finishes loading, send success anyway
                    setTimeout(() => {
                        if (!responded) {
                            responded = true;
                            chrome.tabs.onUpdated.removeListener(listener);
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: "result",
                                    request_id,
                                    status: "success",
                                    url: message.url
                                }));
                            }
                        }
                    }, 15000);
                } else {
                    ws.send(JSON.stringify({ type: "result", request_id, status: "error", error: "Tab actif non trouvé" }));
                }
                return;
            }

            // Forward other tools to content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                try {
                    await chrome.tabs.sendMessage(tab.id, message);
                } catch (e) {
                    console.warn("[Background] Content script not ready, retrying in 1s...", e.message);
                    // Wait 1s and retry once (content script may still be loading)
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        await chrome.tabs.sendMessage(tab.id, message);
                    } catch (e2) {
                        console.error("[Background] Content script unreachable after retry:", e2.message);
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: "result",
                                request_id,
                                status: "error",
                                error: "Le content script n'est pas chargé sur cette page. Essaie de naviguer vers une page web standard."
                            }));
                        }
                    }
                }
            } else {
                ws.send(JSON.stringify({ type: "result", request_id, status: "error", error: "Onglet actif non trouvé pour l'action" }));
            }
        } catch (e) {
            console.error("[Background] Erreur onmessage:", e);
        }
    };
}

// Relayer les messages du content script vers Python
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
});

// Alarm for Keep-alive
chrome.alarms.create("bgKeepAlive", { periodInMinutes: 0.1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "bgKeepAlive") {
        console.log("[Background] Keep-alive tick");
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "heartbeat" }));
        } else {
            connectToBackend(); // Force reconnect if down
        }
    }
});

connectToBackend();
