"""Synthesis provider: phrases the final user-facing response from the
orchestrator's tool results.

The orchestrator (OpenAI, tool-calling) decides *what* data to fetch. Synthesis
decides *how* to phrase the final answer, and its provider is switchable via
SYNTHESIS_PROVIDER (onemin | openai). This keeps a clear separation between the
reasoning brain and the presentation layer.
"""

import logging
from typing import Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_synthesis_llm():
    """Construct the synthesis LLM based on the configured provider."""
    provider = settings.synthesis_provider
    if provider == "onemin":
        from app.agent.onemin_llm import OneMinAIChatModel

        return OneMinAIChatModel(
            api_key=settings.onemin_api_key,
            base_url=settings.onemin_base_url.rstrip("/v1").rstrip("/"),
            model=settings.synthesis_model,
            temperature=0.2,
        )
    # Default / fallback: OpenAI
    return ChatOpenAI(
        model=settings.synthesis_model,
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        temperature=0.2,
    )


def synthesize_response(
    user_message: str,
    orchestrator_answer: str,
    role: str,
    system_prompt: Optional[str] = None,
) -> str:
    """Re-phrase the orchestrator's answer using the synthesis provider.

    Returns the synthesized text, or the original orchestrator answer if
    synthesis fails for any reason (so the demo never dead-ends).
    """
    try:
        llm = _build_synthesis_llm()
        instruction = (
            f"You are MAHALO3, an AI assistant for a {role.replace('_', ' ')}. "
            f"Rewrite the following answer so it is clear, well-formatted, and "
            f"tailored to the user's question. Preserve all facts, IDs, numbers, "
            f"and links exactly; do not invent new data.\n\n"
            f"User question: {user_message}\n\n"
            f"Answer to refine:\n{orchestrator_answer}"
        )
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=instruction))

        result = llm.invoke(messages)
        content = getattr(result, "content", None)
        if content and content.strip():
            return content
        logger.warning("Synthesis returned empty content; using orchestrator answer.")
    except Exception as e:  # noqa: BLE001 - never fail the request on synthesis
        logger.warning("Synthesis failed (%s); using orchestrator answer.", e)
    return orchestrator_answer
