/**
 * content_script.js
 * Exécute les actions sur la page et renvoie les résultats au background.
 */

(function () {
    console.log("[Extension Agent] Content script injecté (Mode Proxy)");

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            handleAction(message);
        } catch (e) {
            console.error("[Extension Agent] Erreur exécution action:", e);
        }
    });

    function handleAction(message) {
        const { tool, request_id } = message;
        console.log("[Extension Agent] Action:", tool);

        switch (tool) {
            case "click_element": {
                const el = document.querySelector(message.selector);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => {
                        el.click();
                        chrome.runtime.sendMessage({ type: "result", request_id, status: "success" });
                    }, 300);
                } else {
                    chrome.runtime.sendMessage({ type: "result", request_id, status: "error", error: "Élément non trouvé" });
                }
                break;
            }

            case "type_text": {
                const el = document.querySelector(message.selector);
                if (el) {
                    el.focus();
                    el.value = message.text;
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    chrome.runtime.sendMessage({ type: "result", request_id, status: "success" });
                } else {
                    chrome.runtime.sendMessage({ type: "result", request_id, status: "error", error: "Champ non trouvé" });
                }
                break;
            }

            case "scroll": {
                const delta = message.direction === "down" ? message.amount : -message.amount;
                window.scrollBy({ top: delta, behavior: "smooth" });
                chrome.runtime.sendMessage({ type: "result", request_id, status: "success" });
                break;
            }

            case "get_page_context": {
                const elements = [...document.querySelectorAll("a, button, input, select, textarea")]
                    .slice(0, 100)
                    .map(el => ({
                        tag: el.tagName.toLowerCase(),
                        text: (el.innerText || el.value || el.placeholder || "").trim().slice(0, 50),
                        selector: el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : getCompactPath(el),
                        type: el.type || null,
                    }))
                    .filter(el => el.text.length > 0 || el.tag === "input");

                chrome.runtime.sendMessage({
                    type: "page_context",
                    request_id,
                    url: window.location.href,
                    title: document.title,
                    interactive_elements: elements,
                    text_content: document.body.innerText.slice(0, 2000),
                });
                break;
            }

            case "press_key":
                document.dispatchEvent(new KeyboardEvent("keydown", { key: message.key, bubbles: true }));
                chrome.runtime.sendMessage({ type: "result", request_id, status: "success" });
                break;
        }
    }

    function getCompactPath(el) {
        if (el.className && typeof el.className === 'string') {
            const firstClass = el.className.split(' ')[0];
            if (firstClass) return `${el.tagName.toLowerCase()}.${firstClass}`;
        }
        return el.tagName.toLowerCase();
    }
})();
