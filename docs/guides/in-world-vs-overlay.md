# In-World vs. Overlay UI

Here’s a quick, practical guide to a design choice you’ll see everywhere: put info “in the world”
vs. “on the glass.”

---

## The two options (plain English)

- **In-world (diegetic):** The information lives inside the scene—on a poster, a gauge, a TV in
  your 3D space, a progress bar painted on a robot’s chassis. It feels like part of the
  environment.
- **Overlay (non-diegetic):** The information sits on top of the scene—HUDs, tooltips, floating
  badges, sticky headers, dashboards, toasts.

---

## Why it matters

- **Immersion & trust:** In-world UI feels real and self-consistent; great for storytelling and
  presence. Overlays are explicit and scannable; great for clarity and speed.
- **Cognitive load:** In-world makes users look at the thing; overlays let them glance through the
  thing.
- **Latency to meaning:** Overlays are faster to parse. In-world is slower but can be more
  memorable.

---

## When to choose which

### Choose in-world if:

- Context matters more than speed (e.g., a warning light on a machine you’re inspecting).
- You want presence/immersion (games, 3D portfolios, spatial product tours).
- The object should remain informative even in screenshots or recordings (diegetic labels,
  floor-plan signage).
- You can guarantee legibility from common viewpoints (distance, angle, lighting).

### Choose overlays if:

- Users must act quickly (alerts, errors, confirmations).
- Data is global or cross-context (fps meter, session status, global search).
- Space is constrained or angles vary wildly (mobile tooltips, hover cards).
- Accessibility/contrast needs are strict and dynamic.

---

## A simple decision checklist (use this verbatim in your PRDs)

1. Primary user goal: speed/accuracy → overlay; understanding/immersion → in-world.
2. Scope of data: object-local → in-world; app-global → overlay.
3. Viewing variability: many angles/sizes → overlay (or mirror both); stable vantage → in-world.
4. A11y & legibility: if contrast/size can’t be guaranteed → overlay.
5. Error/critical states: favor overlay (can also echo in-world).
6. Teachability: first-run overlay coachmarks, then graduate to in-world affordances.

---

## Pattern combos that work well

- Echo critical info: Overlay toast + in-world state change (e.g., machine turns red and you see a
  toast).
- Progression: Start with overlays to teach; move persistent cues into the world once learned.
- Peek & dive: Overlay summary (badge/count) → click to focus the in-world panel on the object.

---

## Examples mapped to common surfaces

- Games: Ammo counter painted on the weapon (in-world) + hit marker as overlay.
- 3D portfolio/site: POIs as subtle pins on objects (in-world) + on-hover overlay card for details.
- Ops dashboard: Inline row chips (in-table, “in-world” for data) + top-level overlay alerts for
  incidents.
- Editor tools: Handles and dimension labels near geometry (in-world) + toolbar overlay for precise
  numeric input.
- Mobile: Context chips near elements (in-world-ish) + bottom sheets (overlay) for edits.

---

## Micro-rules for craft

- Legibility first: Maintain a minimum text size at likely distances; add auto-occlusion/outline.
- Parallax & motion: In 3D, slightly damp label motion; lock orientation to camera for readability.
- State hierarchy: Critical > warning > info; use both channel (overlay) and location (in-world) for
  critical.
- Consistency: Same metric, same place—don’t bounce it between world and overlay without reason.
- Failover: When in-world label risks occlusion, mirror a compact overlay badge.

---

## Quick rubric (score 0–2 each; ≥7 → overlay, ≤5 → in-world)

- Urgency, Variability of view, Accessibility risk, Globalness of data, Need for immersion.

---

If you want, share a screenshot of a screen/scene you’re working on—I’ll mark up exactly what to
move in-world vs. keep as overlay and suggest failovers + a11y tweaks.
