# ADR 0009: Any OpenID Connect provider; only configured methods are shown

**Status:** Accepted

## Context

An open platform should not hard-code who can sign in, and a button that cannot work is worse than no button.

## Decision

Support GitHub, Google and Microsoft by configuration, plus one generic OpenID Connect provider (Keycloak, Okta, Auth0, Entra ID, a company login). A method appears on the sign-in screen only when fully configured.

## Consequences

Companies can plug in their own login. The cost: the generic provider is discovered at server start.
