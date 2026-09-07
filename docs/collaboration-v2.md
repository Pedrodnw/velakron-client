# Collaboration V2 client conventions

The client retains Next.js Pages Router, Redux Toolkit and the existing API middleware. Formal creation is gated by the session feature and permission response; existing V2 records remain readable and actionable when creation is disabled. Server-provided available actions determine buttons. Supplier and OEM view-only roles receive no mutation controls.

Drafts live in component memory, with navigation warnings and version review before resubmission. Stale terminal actions stay visible for copying but cannot be submitted. Canonical bounded command identities support safe retries; technical draft content is not written to browser storage. Responsive drawers trap keyboard focus, preserve scroll, and independently handle nested protected-file confirmation.

Run `npm test` and `npm run build`. The isolated acceptance API can be started from the adjacent server with `NODE_ENV=test node scripts/serveCollaborationV2Acceptance.js`. Its generated test credentials are stored privately under the OS temporary directory and are deleted on shutdown. It uses isolated MongoDB and disabled outbound delivery. Use a distinct client port with its API URL pointed to localhost:5140. Never point this fixture at a configured production database.

The API contract and release procedure live in the server repository under `docs/collaboration-v2/`. Workspace browser evidence is in `docs/acceptance/part-collaboration-v2/`.
