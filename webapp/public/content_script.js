/**
 * content_script.js
 * Executes actions on the page and sends results back to background.
 */

(function () {
    console.log("[Easy Move] Content script injected");

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            handleAction(message);
        } catch (e) {
            console.error("[Easy Move] Error executing action:", e);
            // Send error back so Python future doesn't hang
            chrome.runtime.sendMessage({
                type: "result",
                request_id: message.request_id,
                status: "error",
                error: e.message
            });
        }
    });

    function handleAction(message) {
        const { tool, request_id } = message;
        console.log("[Easy Move] Action:", tool);

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
                    chrome.runtime.sendMessage({ type: "result", request_id, status: "error", error: `Element not found: ${message.selector}` });
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
                    chrome.runtime.sendMessage({ type: "result", request_id, status: "error", error: `Input field not found: ${message.selector}` });
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
                // Limit to 30 elements and 800 chars to avoid overloading the Gemini session
                const elements = [...document.querySelectorAll("a, button, input, select, textarea")]
                    .filter(el => {
                        const rect = el.getBoundingClientRect();
                        // Only include visible elements in or near the viewport
                        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight + 200;
                    })
                    .slice(0, 30)
                    .map((el, index) => ({
                        tag: el.tagName.toLowerCase(),
                        text: (el.innerText || el.value || el.placeholder || el.getAttribute("aria-label") || "").trim().slice(0, 40),
                        selector: getUniqueSelector(el, index),
                        type: el.type || null,
                    }))
                    .filter(el => el.text.length > 0 || el.tag === "input");

                chrome.runtime.sendMessage({
                    type: "result",
                    request_id,
                    status: "success",
                    url: window.location.href,
                    title: document.title,
                    interactive_elements: elements,
                    text_content: document.body.innerText.slice(0, 800),
                });
                break;
            }

            case "press_key": {
                const activeEl = document.activeElement || document.body;
                const opts = { key: message.key, bubbles: true, cancelable: true };
                activeEl.dispatchEvent(new KeyboardEvent("keydown", opts));
                activeEl.dispatchEvent(new KeyboardEvent("keypress", opts));
                activeEl.dispatchEvent(new KeyboardEvent("keyup", opts));

                // Special handling for Enter on forms
                if (message.key === "Enter" && activeEl.form) {
                    activeEl.form.requestSubmit();
                }

                chrome.runtime.sendMessage({ type: "result", request_id, status: "success" });
                break;
            }
        }
    }

    function getUniqueSelector(el, index) {
        // Priority: ID > name > aria-label > nth-child path
        if (el.id) return `#${el.id}`;
        if (el.name) return `[name="${el.name}"]`;

        // Build a more specific path
        const tag = el.tagName.toLowerCase();
        if (el.getAttribute("aria-label")) {
            return `${tag}[aria-label="${el.getAttribute("aria-label")}"]`;
        }

        // Use nth-of-type for uniqueness
        const parent = el.parentElement;
        if (parent) {
            const siblings = [...parent.querySelectorAll(`:scope > ${tag}`)];
            const idx = siblings.indexOf(el) + 1;
            const parentTag = parent.tagName.toLowerCase();
            const parentId = parent.id ? `#${parent.id}` : '';
            if (parentId) return `${parentId} > ${tag}:nth-of-type(${idx})`;
            return `${tag}:nth-of-type(${idx})`;
        }

        return tag;
    }
})();
