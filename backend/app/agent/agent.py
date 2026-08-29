"""Main agent orchestrator using LangChain with OpenAI."""

import json
import logging
from typing import Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session

from app.agent.prompts import ROLE_PROMPTS
from app.agent.session import ChatMessage, ChatSession, get_or_create_session
from app.agent.tools.confluence_tools import create_confluence_tools
from app.agent.tools.github_tools import create_github_tools
from app.agent.tools.jira_tools import create_jira_tools
from app.agent.tools.servicenow_tools import create_servicenow_tools
from app.core.config import settings
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)


def _get_user_integrations(user_id: int, db: Session) -> list[Integration]:
    """Get all integrations for a user."""
    return db.query(Integration).filter(Integration.user_id == user_id).all()


def _build_tools(integrations: list[Integration]) -> list:
    """Build tool list based on user's configured integrations."""
    tools = []
    for integration in integrations:
        if integration.type.value == "jira":
            tools.extend(create_jira_tools(integration.url, integration.token))
        elif integration.type.value == "confluence":
            tools.extend(create_confluence_tools(integration.url, integration.token))
        elif integration.type.value == "github":
            tools.extend(create_github_tools(integration.url, integration.token))
        elif integration.type.value == "servicenow":
            tools.extend(create_servicenow_tools(integration.url, integration.token))
    return tools


def _build_integrations_context(integrations: list[Integration]) -> str:
    """Build a description of available integrations for the system prompt."""
    if not integrations:
        return "No integrations configured. Ask the user to set up connections first."

    context = ""
    for i in integrations:
        context += f"- {i.type.value.title()}: {i.name} ({i.url})"
        if i.project_scope:
            context += f" [Scope: {i.project_scope}]"
        context += "\n"
    return context


def _extract_proposal(content: str) -> tuple[Optional[dict], str]:
    """Extract a proposal from tool output if present."""
    if "__PROPOSAL__" in content and "__END_PROPOSAL__" in content:
        start = content.index("__PROPOSAL__") + len("__PROPOSAL__")
        end = content.index("__END_PROPOSAL__")
        proposal_json = content[start:end]
        try:
            proposal = json.loads(proposal_json)
            return proposal, content[:content.index("__PROPOSAL__")]
        except json.JSONDecodeError:
            pass
    return None, content


async def execute_proposed_action(proposal: dict, integrations: list[Integration]) -> str:
    """Execute a previously proposed write action after user approval."""
    import httpx

    action = proposal.get("action")
    system = proposal.get("system")
    params = proposal.get("params", {})

    # Find the relevant integration
    integration = next(
        (i for i in integrations if i.type.value == system),
        None,
    )
    if not integration:
        return f"Error: No {system} integration configured."

    async with httpx.AsyncClient(timeout=10.0) as client:
        headers = {"X-API-Token": integration.token}

        if action == "create_story":
            response = await client.post(
                f"{integration.url}/stories",
                headers=headers,
                json=params,
            )
            if response.status_code == 201:
                data = response.json()
                return f"✅ Story created successfully: **{data['id']}** - {data['title']}"
            else:
                return f"❌ Failed to create story: {response.text}"

        elif action == "update_story":
            story_id = params["story_id"]
            response = await client.put(
                f"{integration.url}/stories/{story_id}",
                headers=headers,
                json=params.get("changes", {}),
            )
            if response.status_code == 200:
                data = response.json()
                return f"✅ Story updated successfully: **{data['id']}** - {data['title']}"
            else:
                return f"❌ Failed to update story {story_id}: {response.text}"

        elif action == "create_branch":
            response = await client.post(
                f"{integration.url}/repos/{params['repo_id']}/branches",
                headers=headers,
                json={"name": params["branch_name"], "from_branch": params.get("from_branch", "main")},
            )
            if response.status_code == 201:
                data = response.json()
                return f"✅ Branch created successfully: **{data['name']}**"
            else:
                return f"❌ Failed to create branch: {response.text}"

        elif action == "create_incident":
            response = await client.post(
                f"{integration.url}/incidents",
                headers=headers,
                json=params,
            )
            if response.status_code == 201:
                data = response.json()
                return f"✅ Incident opened successfully: **{data['id']}** - {data['title']} ({data['severity']})"
            else:
                return f"❌ Failed to open incident: {response.text}"

        else:
            return f"❌ Unknown action type: {action}"


async def chat(
    message: str,
    user: User,
    session_id: str,
    db: Session,
) -> dict:
    """Process a chat message through the agent and return the response.

    Returns a dict with:
    - response: The agent's text response
    - proposal: Optional proposal dict if a write action was suggested
    - systems_queried: List of systems that were queried
    """
    # Get or create session
    session = get_or_create_session(session_id, user.id)

    # Get user integrations
    integrations = _get_user_integrations(user.id, db)

    # Build tools based on integrations
    tools = _build_tools(integrations)

    # Build system prompt
    role_prompt = ROLE_PROMPTS.get(user.role.value, ROLE_PROMPTS["developer"])
    integrations_context = _build_integrations_context(integrations)
    system_prompt = role_prompt.format(
        integrations_context=integrations_context,
        user_name=user.name,
        user_role=user.role.value.replace("_", " ").title(),
    )

    # Initialize the orchestrator LLM. This is ALWAYS OpenAI: it needs native
    # function calling to decide which tools to invoke from the user's intent.
    llm = ChatOpenAI(
        model=settings.orchestrator_model,
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        temperature=0.1,
    )
    # Bind tools if available
    if tools:
        llm_with_tools = llm.bind_tools(tools)
    else:
        llm_with_tools = llm

    # Build message history
    messages = [SystemMessage(content=system_prompt)]

    # Add conversation history (last 20 messages for context)
    for msg in session.messages[-20:]:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AIMessage(content=msg.content))

    # Add current message
    messages.append(HumanMessage(content=message))

    # Track queried systems
    systems_queried = set()

    # Agent loop: call LLM, execute tools, repeat until done
    max_iterations = 10
    for _ in range(max_iterations):
        response = await llm_with_tools.ainvoke(messages)

        # Check if the model wants to call tools
        if hasattr(response, "tool_calls") and response.tool_calls:
            messages.append(response)

            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                # Track which systems are queried
                if "jira" in tool_name:
                    systems_queried.add("jira")
                elif "confluence" in tool_name:
                    systems_queried.add("confluence")
                elif "github" in tool_name:
                    systems_queried.add("github")
                elif "servicenow" in tool_name:
                    systems_queried.add("servicenow")

                # Find and execute the tool
                tool_fn = next((t for t in tools if t.name == tool_name), None)
                if tool_fn:
                    try:
                        tool_result = tool_fn.invoke(tool_args)
                    except Exception as e:
                        logger.error(f"Tool {tool_name} failed: {e}")
                        tool_result = f"Error executing {tool_name}: {str(e)}"
                else:
                    tool_result = f"Tool {tool_name} not found"

                # Add tool result as a tool message
                from langchain_core.messages import ToolMessage
                messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_call["id"]))
        else:
            # No more tool calls, we have our final response
            final_content = response.content

            # Check for proposals in the response
            proposal, clean_content = _extract_proposal(final_content)

            # If there's a proposal embedded in the response, the agent likely formed a summary too
            # Let's check the raw content for proposal patterns in tool results
            # The proposal is more likely in tool results, re-check
            break

    # Check if any tool call returned a proposal
    proposal = None
    for msg in messages:
        if hasattr(msg, "content") and "__PROPOSAL__" in str(msg.content):
            p, _ = _extract_proposal(str(msg.content))
            if p:
                proposal = p
                break

    final_response = response.content if hasattr(response, "content") else str(response)

    # Synthesis pass: re-phrase the orchestrator's answer using the configured
    # synthesis provider (1min.ai by default, or OpenAI). Skip it when there is
    # a pending write proposal (structured text that must not be reworded) or
    # when no systems were queried (nothing to summarize).
    if final_response and not proposal and systems_queried:
        from app.agent.synthesis import synthesize_response

        final_response = synthesize_response(
            user_message=message,
            orchestrator_answer=final_response,
            role=user.role.value,
            system_prompt=system_prompt,
        )

    # Store in session
    session.messages.append(ChatMessage(role="user", content=message))
    session.messages.append(ChatMessage(role="assistant", content=final_response))

    if proposal:
        session.pending_action = proposal

    return {
        "response": final_response,
        "proposal": proposal,
        "systems_queried": list(systems_queried),
        "session_id": session_id,
    }
