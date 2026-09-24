# Storefront Template Contract

> **Purpose:** Define the boundary between what a storefront *template* may decide (presentation) and what it may never decide (business logic, tenant identity, access). This is the artifact that governs AI-generated (or human-generated) template work — not a data model. See ADR-016 (Single Shared Next.js Storefront) and INV-005/INV-006/INV-008 in the backend repo's `docs/architecture/`.
>
> **Status:** Draft — v0.1
> **Supersedes:** Nothing. New document.
> **Relates to:** ADR-016, INV-005, INV-006, INV-008 (backend `saa9vi_com/docs/architecture/`); `x-saa9vi-channel-token` (header set by trusted reverse proxy, `src/proxy.ts`, `src/lib/vendure/api.ts`)

---

## 1. Why this exists, not a `StorefrontConfiguration` entity

Per ADR-016 / INV-005, Saa9vi runs one shared Next.js storefront across all tenants; academies own content and configuration, not code. The open question this project kept circling was: *how does a tenant end up with a different-looking storefront?*

The answer is **not** a new persistent entity. `TenantProfile.theme` is already roadmapped for Phase 4 (visual theming — logo, colors, fonts). Template *structure* (which page layout, which components, which flow) is a distinct concern from theme (visual identity), and at current scale (pre-first-tenant-onboarding) there's no evidence either needs to be a tenant-configurable, persisted, versioned setting. It needs to be:

1. **A contract** — what data a template receives, what it may and may not do with it.
2. **A resolution mechanism** — how a request picks a template, cheaply, without adding a new async boundary to the request path.
3. **A registry** — where templates live in the codebase, and who's allowed to add one.

Persistence (a `templateId` column, an admin UI to switch templates, per-tenant template drafts) is deferred until real onboarding demonstrates the need. This document assumes **static template assignment at the code level** — same tier of decision as the channel-token fallback in `src/lib/vendure/channel.ts` today.

The channel token a request will be resolved against is the one already established by the header chain: custom domain → `x-saa9vi-channel-token` (set by trusted reverse proxy / `resolve-channel` route) → read in `src/lib/vendure/api.ts` via `getChannelTokenFromHeaders()`, falling back to `channel.ts`'s `getChannelToken()` (env-var priority). Template resolution keys off that already-resolved token — it does not introduce its own lookup.
---

## 2. What a template receives

Templates render **domain data only** — the same shapes already returned by the storefront's domain-oriented GraphQL operations (INV-006). A template never queries Vendure directly; it receives fully-resolved props from the page that has already called `lib/vendure/`.

```
Template receives:
─────────────────────
tenant          (businessName, logo, tagline, customDomain)
locale, currency
products, collections
instructors
sessions           (via myLearningDashboard / public sessions)
cmsContent         (cmsPage, articles, banners)
reviews
cart, checkout state
```

If a template needs a field that isn't already exposed by a domain API, that's a signal to extend the domain API — not to reach past it.

---

## 3. What a template may do

- Change layout, visual hierarchy, page composition, section ordering.
- Compose approved shared components (`ProductCard`, `CourseCard`, `InstructorCard`, `SessionCard`, `UpcomingLiveSessions`, `MyLearning`, etc. — see §5).
- Introduce new presentation-only components (a new hero layout, a new card style) as long as they consume props, not queries.
- Vary structurally between templates — a "coaching" template and a "tutor" template can have completely different page flows against the same data.

---

## 4. What a template may never do — and how each is enforced

This list is split deliberately. Half of it is mechanically enforceable; half depends on how the domain layer is shaped, not on catching violations after the fact.

### 4a. Lint-enforceable (build-time, mechanical — see §9 / ESLint guardrail)

| Forbidden | Why |
|---|---|
| `fetch('/shop-api'` / `fetch('/admin-api'` literals | Bypasses the `lib/vendure/` abstraction entirely |
| Setting `x-saa9vi-channel-token` (or any channel-token) header directly | Bypasses trusted channel resolution (INV-001). The header is set only by trusted reverse-proxy code; template code must never set it |
| Calling `getChannelToken()` / `getChannelTokenFromHeaders()` outside `lib/vendure/` | Same — these belong to the resolution layer, not template code |
| Importing anything from `lib/vendure/` internals not on the approved template-facing export list | Prevents templates from reaching past the domain API boundary |

**Why these are forbidden (no single-incident precedent needed):** every item on this list is a mechanism by which a template could cause one tenant to observe another tenant's data. The channel token *is* the isolation boundary (INV-001); code that reads or sets it outside the trusted resolution layer acts on that boundary directly, which is the isolation risk full stop. These rules are enforced mechanically because the failure is silent and cross-tenant.

### 4b. API-design-enforced (no data to misuse, not a rule to violate)

| Forbidden | Why it's structural, not a lint rule |
|---|---|
| Calculating price, discounts, or totals in the template | If the domain layer never sends raw pricing inputs — only a final `displayPrice` — there's nothing to compute wrong |
| Evaluating trial eligibility, capacity, or entitlement | `myLearningDashboard` already computes `ctaAction`/`ctaLabel` server-side (INV-008) — a template just renders the field |
| Deciding whether a session is joinable | Same pattern: server sends a boolean / URL, template renders it |
| Inferring channel/tenant identity from anything other than the props it's given | If the domain data is the only source of tenant identity available to a template, there's no alternative path to misuse |
**The general principle:** where possible, don't give a template the ingredients to break INV-008 — precompute the decision server-side and hand the template a rendering instruction. Where that isn't fully possible, rely on code review, not runtime enforcement.
---

## 5. Approved component surface (starting set)

Templates compose these; they don't reinvent them.

```
components/
  ProductCard
  CourseCard
  InstructorCard
  SessionCard
  UpcomingLiveSessions
  MyLearning
  TrialCTA
  Header
  Footer
  ReviewList
```

New shared components are added here when a second template needs the same primitive — not duplicated per-template.

> **Note on status:** this list is **prescriptive**, not yet a complete roster of files. The storefront repo currently ships ~97 component files under `src/components/`, including `commerce/product-card.tsx`, `commerce/review-card.tsx`, `layout/footer.tsx`, `layout/navbar.tsx`, and `layout/hero-section.tsx`. As templates are built (Phase B/C), each listed component is mapped to a real file; names are formalized at integration time, not guessed now.

---

## 6. Template resolution — no new async boundary

Given static assignment (§1), template resolution is a **synchronous lookup**, resolved at the same point and same tier as the channel-token fallback in `src/lib/vendure/channel.ts`. It does not need its own caching story or a `use cache`-style async wrapper — those would only be justified once template selection needs to be tenant-configurable at runtime (i.e., once it's backed by a Vendure query, not a static map).

The token used to key the template is the same channel token the request layer already resolved (see §1) — it is passed down explicitly, matching how `channel.ts` documents its own sync constraint (must be synchronous because it's called inside `'use cache'` scopes).

```ts
// lib/storefront/template-registry.ts
import { getChannelToken } from '@/lib/vendure/channel';

export const TEMPLATE_REGISTRY: Record<string, TemplateId> = {
  'mehta-academy': 'coaching-modern',
  'sharma-tutor': 'tutor-personal',
  // ...
};

export const DEFAULT_TEMPLATE: TemplateId = 'coaching-modern';

export function resolveTemplate(): TemplateId {
  const token = getChannelToken(); // already-resolved channel token (see §1)
  return TEMPLATE_REGISTRY[token] ?? DEFAULT_TEMPLATE;
}
```

No Vendure round trip, no new cache-tag dimension, no `next/headers()`.

**Escalation path:** if/when this needs to be tenant-configurable, the natural upgrade is a `TenantProfile.customFields.templateId` (alongside the already-roadmapped `theme` field in Phase 4) — not a new entity. Only promote to a dedicated entity if requirements demonstrate a need for versioning, drafts, or an approval workflow around template changes.
---

## 7. Where AI Studio fits

```
Cline (implementation, repo integration)
        │
        ▼
AI Studio — visual/template generation only
  scope: templates/, and additions to components/ under this contract
  never touches: lib/vendure/, app/api/, channel resolution, checkout
        │
        ▼
Cline — integrates generated output into templates/<name>/
        │
        ▼
ESLint guardrail — mechanical check, §4a
        │
        ▼
Human review — §4b, structural/API-design checks
```

AI Studio is not a second Cline. It produces presentation code against this contract; Cline remains responsible for wiring it into the repo.

---

## 8. Open questions (not resolved by this document)

- Does `templateId` eventually merge with the Phase 4 `theme` field on `TenantProfile`, or stay separate? (Structural vs. visual — likely separate, but worth deciding before Phase 4.)
- What happens when a template is manually edited post-generation and then regenerated by AI Studio? (Versioning/clobber risk — out of scope until template count > 1.)
- i18n: templates must support the existing `[locale]` routing from day one — not retrofitted.

---

## 9. Sequence

```
Phase A — This contract + approved component list (prescriptive, §5) + lint rules (Option 3 / ESLint)
Phase B — Template 01 "Coaching Modern" — validate against this contract, integrate via Cline
Phase C — Template 02 "Tutor Personal" — prove same backend/domain API works, no code fork
Phase D — Only if real onboarding demands it: static registry → TenantProfile field → dedicated entity
```