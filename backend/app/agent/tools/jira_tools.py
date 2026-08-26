"""LangChain tools for Mock Jira service."""

import json
from typing import Optional

import httpx
from langchain_core.tools import tool


def _make_jira_request(url: str, token: str, method: str = "GET", endpoint: str = "", params: dict = None, body: dict = None) -> dict:
    """Make a request to the Jira mock service."""
    headers = {"X-API-Token": token}
    full_url = f"{url}{endpoint}"

    with httpx.Client(timeout=10.0) as client:
        if method == "GET":
            response = client.get(full_url, headers=headers, params=params)
        elif method == "POST":
            response = client.post(full_url, headers=headers, json=body)
        elif method == "PUT":
            response = client.put(full_url, headers=headers, json=body)
        else:
            return {"error": f"Unsupported method: {method}"}

    if response.status_code == 200 or response.status_code == 201:
        return response.json()
    else:
        return {"error": f"Request failed with status {response.status_code}: {response.text}"}


def create_jira_tools(jira_url: str, jira_token: str):
    """Create LangChain tools configured for a specific Jira instance."""

    @tool
    def jira_search_stories(query: str, project_id: Optional[str] = None, status: Optional[str] = None, assignee: Optional[str] = None) -> str:
        """Search for stories in Jira by keyword. Can filter by project_id, status (todo/in_progress/in_review/done), and assignee (developer ID like dev-1).
        If project_id is not specified, searches across all projects."""
        results = []
        if project_id:
            params = {}
            if status:
                params["status"] = status
            if assignee:
                params["assignee"] = assignee
            data = _make_jira_request(jira_url, jira_token, endpoint=f"/projects/{project_id}/stories", params=params)
            if "stories" in data:
                # Filter by query keyword in title/description
                for s in data["stories"]:
                    if query.lower() in s["title"].lower() or query.lower() in s.get("description", "").lower():
                        results.append(s)
                if not results:
                    results = data["stories"]  # Return all if no keyword match
        else:
            # Search across all projects
            projects_data = _make_jira_request(jira_url, jira_token, endpoint="/projects")
            if "projects" in projects_data:
                for proj in projects_data["projects"]:
                    params = {}
                    if status:
                        params["status"] = status
                    if assignee:
                        params["assignee"] = assignee
                    data = _make_jira_request(jira_url, jira_token, endpoint=f"/projects/{proj['id']}/stories", params=params)
                    if "stories" in data:
                        for s in data["stories"]:
                            if query.lower() in s["title"].lower() or query.lower() in s.get("description", "").lower():
                                results.append(s)

        if not results:
            return f"No stories found matching '{query}'"

        output = f"Found {len(results)} stories matching '{query}':\n"
        for s in results:
            output += f"- [{s['id']}] {s['title']} | Status: {s['status']} | Points: {s['story_points']} | Assignee: {s.get('assignee', 'Unassigned')}\n"
        return output

    @tool
    def jira_get_story(story_id: str) -> str:
        """Get detailed information about a specific Jira story by its ID (e.g., PAY-105)."""
        data = _make_jira_request(jira_url, jira_token, endpoint=f"/stories/{story_id}")
        if "error" in data:
            return f"Error: {data['error']}"

        output = f"**{data['id']}: {data['title']}**\n"
        output += f"- Status: {data['status']}\n"
        output += f"- Priority: {data['priority']}\n"
        output += f"- Story Points: {data['story_points']}\n"
        output += f"- Assignee: {data.get('assignee_details', {}).get('name', data.get('assignee', 'Unassigned'))}\n"
        output += f"- Sprint: {data.get('sprint_id', 'Backlog')}\n"
        output += f"\nDescription: {data['description']}\n"
        if data.get("acceptance_criteria"):
            output += "\nAcceptance Criteria:\n"
            for ac in data["acceptance_criteria"]:
                output += f"  - {ac}\n"
        if data.get("comments"):
            output += "\nComments:\n"
            for c in data["comments"]:
                output += f"  - [{c['date']}] {c['author']}: {c['text']}\n"
        return output

    @tool
    def jira_get_sprint_info(project_id: str) -> str:
        """Get sprint information and velocity data for a project. Use project IDs like PAY, CART, AUTH, PROD, ORD."""
        data = _make_jira_request(jira_url, jira_token, endpoint=f"/sprints/{project_id}")
        if "error" in data:
            return f"Error: {data['error']}"

        output = f"Sprints for project {project_id}:\n"
        for sprint in data.get("sprints", []):
            output += f"\n**{sprint['name']}** ({sprint['status']})\n"
            output += f"  Period: {sprint['start_date']} to {sprint['end_date']}\n"
            if sprint.get("velocity"):
                output += f"  Velocity: {sprint['velocity']} points\n"
            if sprint.get("completed_points") is not None:
                output += f"  Completed: {sprint['completed_points']}/{sprint['total_points']} points\n"
        return output

    @tool
    def jira_get_board(project_id: str) -> str:
        """Get the current sprint board showing stories grouped by status for a project."""
        data = _make_jira_request(jira_url, jira_token, endpoint=f"/projects/{project_id}/board")
        if "error" in data:
            return f"Error: {data['error']}"

        if not data.get("sprint"):
            return f"No active sprint found for project {project_id}"

        sprint = data["sprint"]
        columns = data["columns"]
        output = f"**Sprint Board: {sprint['name']}** ({sprint['start_date']} to {sprint['end_date']})\n\n"

        for col_name, stories in columns.items():
            output += f"📌 {col_name.upper()} ({len(stories)}):\n"
            for s in stories:
                output += f"  - [{s['id']}] {s['title']} ({s['story_points']}pts) - {s.get('assignee', 'Unassigned')}\n"
            output += "\n"
        return output

    @tool
    def jira_create_story(project_id: str, title: str, description: str, priority: str = "medium", story_points: int = 0, assignee: Optional[str] = None) -> str:
        """[WRITE ACTION - REQUIRES APPROVAL] Create a new story in Jira. Returns a proposal for user confirmation.
        project_id: PAY, CART, AUTH, PROD, or ORD.
        priority: critical, high, medium, or low.
        assignee: developer ID (dev-1 through dev-5) or None."""
        # This is a write action - return proposal instead of executing
        proposal = {
            "action": "create_story",
            "system": "jira",
            "params": {
                "project_id": project_id,
                "title": title,
                "description": description,
                "priority": priority,
                "story_points": story_points,
                "assignee": assignee,
            },
            "description": f"Create a new story in project {project_id}: '{title}'",
        }
        return f"__PROPOSAL__{json.dumps(proposal)}__END_PROPOSAL__"

    @tool
    def jira_list_projects() -> str:
        """List all available Jira projects."""
        data = _make_jira_request(jira_url, jira_token, endpoint="/projects")
        if "error" in data:
            return f"Error: {data['error']}"

        output = "Available projects:\n"
        for p in data.get("projects", []):
            output += f"- **{p['id']}**: {p['name']} - {p['description']}\n"
        return output

    return [jira_list_projects, jira_search_stories, jira_get_story, jira_get_sprint_info, jira_get_board, jira_create_story]
