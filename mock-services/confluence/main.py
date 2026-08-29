"""Mock Confluence Service - Simulates Confluence REST API for MAHALO3."""

import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query

import store
from store import PAGES, SPACES

app = FastAPI(title="Mock Confluence Service", version="1.0.0")

API_TOKEN = os.environ.get("MOCK_CONFLUENCE_TOKEN", "mock-confluence-token-12345")


def verify_token(x_api_token: Optional[str] = Header(None)):
    """Validate API token from request header."""
    if x_api_token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid API token")


# --- Health ---

@app.get("/health")
def health():
    return {"status": "healthy", "service": "mock-confluence", "version": "1.0.0"}


# --- Spaces ---

@app.get("/spaces")
def list_spaces(x_api_token: Optional[str] = Header(None)):
    verify_token(x_api_token)
    return {"spaces": SPACES}


@app.get("/spaces/{space_id}")
def get_space(space_id: str, x_api_token: Optional[str] = Header(None)):
    verify_token(x_api_token)
    space = next((s for s in SPACES if s["id"] == space_id), None)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@app.get("/pages")
def list_all_pages(
    space_id: Optional[str] = Query(None),
    x_api_token: Optional[str] = Header(None),
):
    """Flat list of all pages across spaces (without full content), optionally by space."""
    verify_token(x_api_token)
    pages = [
        {
            "id": p["id"],
            "title": p["title"],
            "author": p["author"],
            "last_updated": p["last_updated"],
            "space_id": p["space_id"],
        }
        for p in PAGES
        if not space_id or p["space_id"] == space_id
    ]
    return {"pages": pages, "total": len(pages)}


@app.get("/spaces/{space_id}/pages")
def list_pages(space_id: str, x_api_token: Optional[str] = Header(None)):
    """List pages in a space (without full content for performance)."""
    verify_token(x_api_token)
    pages = [
        {
            "id": p["id"],
            "title": p["title"],
            "author": p["author"],
            "last_updated": p["last_updated"],
            "space_id": p["space_id"],
        }
        for p in PAGES
        if p["space_id"] == space_id
    ]
    return {"pages": pages, "total": len(pages)}


# --- Pages ---

@app.get("/pages/{page_id}")
def get_page(page_id: str, x_api_token: Optional[str] = Header(None)):
    """Get full page content."""
    verify_token(x_api_token)
    page = next((p for p in PAGES if p["id"] == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


# --- Search ---

@app.get("/search")
def search_pages(
    q: str = Query(..., min_length=1, description="Search query"),
    space_id: Optional[str] = Query(None, description="Filter by space"),
    x_api_token: Optional[str] = Header(None),
):
    """Full-text search across all pages."""
    verify_token(x_api_token)

    query_lower = q.lower()
    results = []

    for page in PAGES:
        # Filter by space if specified
        if space_id and page["space_id"] != space_id:
            continue

        # Search in title and content
        title_match = query_lower in page["title"].lower()
        content_match = query_lower in page["content"].lower()

        if title_match or content_match:
            # Create excerpt around the match
            excerpt = ""
            if content_match:
                content_lower = page["content"].lower()
                idx = content_lower.find(query_lower)
                start = max(0, idx - 100)
                end = min(len(page["content"]), idx + len(q) + 100)
                excerpt = "..." + page["content"][start:end] + "..."
            else:
                excerpt = page["content"][:200] + "..."

            results.append(
                {
                    "id": page["id"],
                    "title": page["title"],
                    "space_id": page["space_id"],
                    "author": page["author"],
                    "last_updated": page["last_updated"],
                    "excerpt": excerpt,
                    "relevance": 1.0 if title_match else 0.7,
                }
            )

    # Sort by relevance
    results.sort(key=lambda x: x["relevance"], reverse=True)

    return {"results": results, "total": len(results), "query": q}
