# tools.py
import logging
from google.adk.tools import ToolContext
from . import browser_state

logger = logging.getLogger(__name__)


async def navigate(url: str, tool_context: ToolContext) -> dict:
    """Navigates to the specified URL in the current browser tab.

    Args:
        url: The full URL to navigate to, including https://.

    Returns:
        A dictionary with status 'success' or 'error'.
    """
    logger.info(f"Navigating to {url}")
    return await browser_state.send_request("navigate", {"url": url}, timeout=20)


async def click_element(selector: str, tool_context: ToolContext) -> dict:
    """Clicks the element identified by the CSS selector.

    Use get_page_context first to know the available selectors.

    Args:
        selector: CSS selector of the element to click.

    Returns:
        A dictionary with status 'success' or 'error'.
    """
    logger.info(f"Clicking {selector}")
    return await browser_state.send_request("click_element", {"selector": selector})


async def type_text(selector: str, text: str, tool_context: ToolContext) -> dict:
    """Types text into the input field identified by the CSS selector.

    Args:
        selector: CSS selector of the input field.
        text: The text to enter.

    Returns:
        A dictionary with status 'success' or 'error'.
    """
    logger.info(f"Typing '{text}' in {selector}")
    return await browser_state.send_request("type_text", {"selector": selector, "text": text})


async def scroll(direction: str, amount: int, tool_context: ToolContext) -> dict:
    """Scrolls the page up or down.

    Args:
        direction: Direction to scroll, either 'down' or 'up'.
        amount: Distance in pixels to scroll. Use 300 for a small scroll, 9999 to go to the bottom.

    Returns:
        A dictionary with status 'success' or 'error'.
    """
    return await browser_state.send_request("scroll", {"direction": direction, "amount": amount})


async def get_page_context(tool_context: ToolContext) -> dict:
    """Retrieves the structure, text content, and interactive elements of the current page.

    Use this tool BEFORE any interaction to know the available buttons, links, and input fields.

    Returns:
        A dictionary with page URL, title, interactive elements, and text content.
    """
    logger.info("Getting page context...")
    return await browser_state.send_request("get_page_context", {})


async def press_key(key: str, tool_context: ToolContext) -> dict:
    """Simulates a key press on the active page.

    Args:
        key: The key name to press. Common values: Enter, Escape, Tab, ArrowDown, ArrowUp, Backspace.

    Returns:
        A dictionary with status 'success' or 'error'.
    """
    return await browser_state.send_request("press_key", {"key": key})


