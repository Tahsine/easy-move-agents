import os
from pathlib import Path
from google.adk.agents.llm_agent import Agent
from live_agents.tools import (
    navigate,
    click_element,
    type_text,
    scroll,
    get_page_context,
    press_key,
)

# Load system prompt from external file
_prompt_path = Path(__file__).parent / "system_prompt.txt"
_system_prompt = _prompt_path.read_text(encoding="utf-8")

root_agent = Agent(
    model=os.getenv("DEMO_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"),
    name='easy_move_agent',
    description='A voice-controlled web navigation agent powered by Gemini Live API.',
    instruction=_system_prompt,
    tools=[
        navigate,
        click_element,
        type_text,
        scroll,
        get_page_context,
        press_key,
    ],
)
