# Contributing

## Setup
- Contract (TypeScript): `cd packages/contract/ts && npm install && npm test`
- Contract (Python): `pip install -e packages/contract/py pytest pyyaml && pytest packages/contract/py`
- Mock server: `pip install -r apps/mock-server/requirements.txt && cd apps/mock-server && pytest`
- Run the mock API: `cd apps/mock-server && uvicorn main:app --reload`
- Prototype: open `prototype/openlobs.html` in a browser.

## Changing the contract
The event and resource schemas exist in two languages and must always agree.
1. Edit both `packages/contract/ts/src` and `packages/contract/py/openlobs_contract`, including the semantic validator.
2. Add or update fixtures in `packages/contract/fixtures`, including a deliberately invalid case in `invalid/`.
3. Regenerate the API description: `python packages/contract/py/scripts_gen_openapi.py`.
4. All suites must pass. CI fails if `openapi.yaml` is stale.

## Pull requests
- Branch from `main`, keep a PR to one topic, and fill in the template.
- Add or update a test with every behaviour change.
- Security-relevant changes (permissions, approvals, tool execution) need a note on the threat they address.

## Principles
Ask before acting. Explain every decision. Keep resource types distinct. Render events, do not invent them.
