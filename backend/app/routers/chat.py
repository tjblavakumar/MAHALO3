"""Chat router: conversation endpoint for the AI agent."""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agent.agent import chat, execute_proposed_action
from app.agent.session import get_session
from app.core.config import settings

logger = logging.getLogger(__name__)
from app.core.database import get_db
from app.models.integration import Integration
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request body for chat message."""

    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response from the chat agent."""

    response: str
    proposal: Optional[dict] = None
    systems_queried: list[str] = []
    session_id: str


class ActionApprovalRequest(BaseModel):
    """Request to approve or reject a proposed action."""

    session_id: str
    approved: bool


class ActionResult(BaseModel):
    """Result of executing an approved action."""

    success: bool
    message: str


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to the AI agent and get a response."""
    session_id = request.session_id or str(uuid.uuid4())

    try:
        # Use LLM agent if API key is configured, otherwise use demo agent
        if settings.openai_api_key and "1min.ai" in settings.openai_base_url:
            # 1min.ai: use demo agent for tool routing + LLM for response synthesis
            from app.agent.demo_agent import demo_chat
            from app.agent.onemin_llm import OneMinAIChatModel

            raw_result = await demo_chat(
                message=request.message,
                user=current_user,
                session_id=session_id,
                db=db,
            )

            # If we got tool results, ask 1min.ai to synthesize a polished response
            if raw_result["systems_queried"] and not raw_result.get("proposal"):
                try:
                    llm = OneMinAIChatModel(
                        api_key=settings.openai_api_key,
                        base_url=settings.openai_base_url.rstrip("/v1").rstrip("/"),
                        model="gpt-4o",
                        temperature=0.1,
                    )
                    from langchain_core.messages import HumanMessage as HM
                    synthesis_prompt = (
                        f"You are MAHALO3, an AI assistant for a {current_user.role.value.replace('_', ' ')}. "
                        f"Based on the following data retrieved from project management systems, "
                        f"provide a clear, well-formatted summary for the user who asked: \"{request.message}\"\n\n"
                        f"Retrieved data:\n{raw_result['response']}"
                    )
                    llm_response = llm.invoke([HM(content=synthesis_prompt)])
                    raw_result["response"] = llm_response.content
                except Exception as e:
                    # If LLM synthesis fails, keep the raw tool output (still useful)
                    logger.warning(f"1min.ai synthesis failed, using raw output: {e}")

            result = raw_result

        elif settings.openai_api_key:
            result = await chat(
                message=request.message,
                user=current_user,
                session_id=session_id,
                db=db,
            )
        else:
            from app.agent.demo_agent import demo_chat
            result = await demo_chat(
                message=request.message,
                user=current_user,
                session_id=session_id,
                db=db,
            )

        return ChatResponse(
            response=result["response"],
            proposal=result.get("proposal"),
            systems_queried=result.get("systems_queried", []),
            session_id=result["session_id"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(e)}",
        )


@router.post("/approve", response_model=ActionResult)
async def approve_action(
    request: ActionApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve or reject a proposed write action."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.pending_action:
        raise HTTPException(status_code=400, detail="No pending action to approve")

    if not request.approved:
        # User rejected the action
        session.pending_action = None
        return ActionResult(success=True, message="Action rejected. How else can I help?")

    # Execute the approved action
    integrations = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id)
        .all()
    )

    try:
        result_message = await execute_proposed_action(session.pending_action, integrations)
        session.pending_action = None
        return ActionResult(success=True, message=result_message)
    except Exception as e:
        session.pending_action = None
        return ActionResult(success=False, message=f"Failed to execute action: {str(e)}")
