import os
from google.adk.agents.llm_agent import Agent
from google.adk.tools import google_search

# Mock tool implementation
def get_current_time(city: str) ->  dict:
    """Returns the current time in a specified city."""
    return {"status": "success", "city": city, "time": "12:00 AM"}

root_agent = Agent(
    model=os.getenv("DEMO_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"),
    name='root_agent',
    description='A helpful assistant for user questions.',
    instruction='You are a helpful assistant that can search the web',
    tools=[google_search],
)
