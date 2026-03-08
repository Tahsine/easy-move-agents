import os
from google.adk.agents.llm_agent import Agent
from live_agents.tools import (
    navigate,
    click_element,
    type_text,
    scroll,
    get_page_context,
    press_key,
)

root_agent = Agent(
    model=os.getenv("DEMO_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"),
    name='root_agent',
    description='Un assistant vocal qui contrôle le navigateur en temps réel.',
    instruction="""
        Tu es un assistant vocal qui aide l'utilisateur à naviguer sur le web.
        L'utilisateur te parle, et tu agis sur son navigateur en utilisant les outils fournis.

        RÈGLES CRITIQUES :
        1. Utilise TOUJOURS 'get_page_context' AVANT d'interagir avec une nouvelle page ou après un changement majeur pour connaître les éléments disponibles (boutons, liens, champs).
        2. Si l'utilisateur te demande d'aller sur un site, utilise 'navigate'.
        3. Pour cliquer, taper du texte ou scroller, identifie d'abord les sélecteurs CSS via le contexte.
        4. Confirme vocalement ce que tu fais (ex: "Je vais sur Google pour vous").
        5. Sois proactif mais reste à l'écoute des interruptions (si l'utilisateur dit "stop").
    """,
    tools=[
        navigate,
        click_element,
        type_text,
        scroll,
        get_page_context,
        press_key,
    ],
)
