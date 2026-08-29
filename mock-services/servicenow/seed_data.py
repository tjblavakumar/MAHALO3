"""Seed data for the Mock ServiceNow service.

Aligned to the existing services (repos/projects) and developers (dev-1..dev-6)
used by the JIRA/GitHub/Confluence mocks, so deployments and incidents can be
correlated across systems.

Service IDs mirror the GitHub repos / JIRA projects:
  payment-service (repo-1 / PAY), cart-service (repo-2 / CART),
  auth-service (repo-3 / AUTH), product-service (repo-4 / PROD),
  order-service (repo-5 / ORD).
"""

SERVICES = [
    {"id": "payment-service", "repo_id": "repo-1", "project_id": "PAY", "name": "Payment Service"},
    {"id": "cart-service", "repo_id": "repo-2", "project_id": "CART", "name": "Cart Service"},
    {"id": "auth-service", "repo_id": "repo-3", "project_id": "AUTH", "name": "Auth Service"},
    {"id": "product-service", "repo_id": "repo-4", "project_id": "PROD", "name": "Product Service"},
    {"id": "order-service", "repo_id": "repo-5", "project_id": "ORD", "name": "Order Service"},
]

# environment: staging | production
# status: success | failed | rolled_back | in_progress
DEPLOYMENTS = [
    {
        "id": "DEP-1001",
        "service": "auth-service",
        "environment": "production",
        "version": "v2.4.0",
        "status": "success",
        "deployed_by": "dev-3",
        "deployed_at": "2026-08-21T14:30:00Z",
        "duration_seconds": 214,
        "linked_story": "AUTH-304",
        "linked_pr": 56,
        "notes": "TOTP 2FA rollout to production.",
    },
    {
        "id": "DEP-1002",
        "service": "payment-service",
        "environment": "production",
        "version": "v3.1.2",
        "status": "success",
        "deployed_by": "dev-1",
        "deployed_at": "2026-08-20T09:10:00Z",
        "duration_seconds": 178,
        "linked_story": "PAY-105",
        "linked_pr": 142,
        "notes": "Google Pay integration.",
    },
    {
        "id": "DEP-1003",
        "service": "product-service",
        "environment": "production",
        "version": "v1.9.0",
        "status": "failed",
        "deployed_by": "dev-4",
        "deployed_at": "2026-08-18T16:45:00Z",
        "duration_seconds": 92,
        "linked_story": "PROD-403",
        "linked_pr": 93,
        "notes": "Recommendations engine deploy failed on migration step.",
    },
    {
        "id": "DEP-1004",
        "service": "product-service",
        "environment": "production",
        "version": "v1.9.1",
        "status": "rolled_back",
        "deployed_by": "dev-4",
        "deployed_at": "2026-08-18T18:05:00Z",
        "duration_seconds": 140,
        "linked_story": "PROD-403",
        "linked_pr": 93,
        "notes": "Rolled back after elevated error rate post-deploy.",
    },
    {
        "id": "DEP-1005",
        "service": "order-service",
        "environment": "staging",
        "version": "v2.0.0-rc1",
        "status": "success",
        "deployed_by": "dev-5",
        "deployed_at": "2026-08-20T11:20:00Z",
        "duration_seconds": 165,
        "linked_story": "ORD-503",
        "linked_pr": 71,
        "notes": "Split fulfillment release candidate to staging.",
    },
    {
        "id": "DEP-1006",
        "service": "cart-service",
        "environment": "production",
        "version": "v4.2.3",
        "status": "success",
        "deployed_by": "dev-2",
        "deployed_at": "2026-08-19T13:00:00Z",
        "duration_seconds": 121,
        "linked_story": "CART-204",
        "linked_pr": 87,
        "notes": "Wishlist to cart conversion.",
    },
]

# severity: P1 (critical) | P2 (high) | P3 (medium) | P4 (low)
# status: open | investigating | resolved
INCIDENTS = [
    {
        "id": "INC-2001",
        "title": "Product recommendations returning 500s after deploy",
        "severity": "P1",
        "status": "resolved",
        "affected_service": "product-service",
        "assignee": "dev-4",
        "opened_at": "2026-08-18T16:52:00Z",
        "resolved_at": "2026-08-18T18:10:00Z",
        "linked_deployment": "DEP-1003",
        "description": "Failed migration during v1.9.0 caused 500s. Resolved by rollback to v1.8.x.",
    },
    {
        "id": "INC-2002",
        "title": "Elevated payment latency during peak",
        "severity": "P2",
        "status": "investigating",
        "affected_service": "payment-service",
        "assignee": "dev-1",
        "opened_at": "2026-08-21T19:30:00Z",
        "resolved_at": None,
        "linked_deployment": None,
        "description": "p95 latency above SLA during evening peak. Investigating provider timeouts.",
    },
    {
        "id": "INC-2003",
        "title": "2FA SMS fallback intermittently failing",
        "severity": "P3",
        "status": "open",
        "affected_service": "auth-service",
        "assignee": "dev-3",
        "opened_at": "2026-08-22T08:15:00Z",
        "resolved_at": None,
        "linked_deployment": "DEP-1001",
        "description": "Some users report SMS fallback not delivered after TOTP rollout.",
    },
    {
        "id": "INC-2004",
        "title": "Cart totals off by rounding for JPY",
        "severity": "P4",
        "status": "open",
        "affected_service": "cart-service",
        "assignee": "dev-2",
        "opened_at": "2026-08-20T10:40:00Z",
        "resolved_at": None,
        "linked_deployment": None,
        "description": "Minor rounding discrepancy for JPY carts. Low impact.",
    },
]
