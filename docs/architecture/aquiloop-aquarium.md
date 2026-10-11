# Aquiloop aquarium exhibit

The Aquiloop repository POI occupies the ground-floor living room at world
`(0, -28)`. Its approach is on the positive-Z side, clear of the stairs to the
east and existing furniture to the west. The basement NRL aquarium remains a
separate career exhibit. Neither museum furniture nor stairs are moved.

The rectangular normal-water model measures approximately 1.83 × 0.61 × 0.509
world metres: 0.568 cubic metres, approximately 150 US gallons. The stand has a
continuous top, six thick legs, broad feet, a lower shelf and crossed rear braces.
This visually represents a substantial stand for the owner's estimated
1,500–1,800 lb load; it is a game prop, not engineering certification.

## Visual exchange and finite capacity

The first drain begins after 300 seconds of active simulation. Starts thereafter
are 300 seconds apart. Drain, refill and fictional replenishment each take 30
seconds, followed by 210 seconds at rest. The tank loses exactly 20% of its normal
water height (30 gallons) and never falls below 120 gallons.

Eight amber receivers each accept 3.75 gallons, leaving 1.25 gallons of nominal
headroom in every 5-gallon bucket. Eight distinct blue supply buckets each begin
with 3.75 gallons and empty during refill through the visible peristaltic pump.
Bucket level windows show individual quantities. Their surface positions are
different from the tank, with supply on an elevated rack and receivers near the
floor. Tubes connect the banks, tank and pump.

During the explicitly labeled **game replenishment** phase, an imaginary exchange
service removes waste and restores an equal amount of fresh supply. This is not a
depiction of filtering waste back into treated water. All visible levels vary
continuously across boundaries; total visible tank + receiver + supply volume
stays 180 gallons. No hidden infinite accumulation or lone overflowing bucket is
used. There is no real-world operating guidance, hardware control or pump safety
claim.

## Interaction and rendering

The normal POI route and text portfolio expose the repository link and complete
cycle description. Nearby keyboard-accessible controls pause/resume the simulation
and show quantities; phase changes use a polite live region. Controls currently
use the English fallback copy. Background tabs and unfocused windows suspend active
time without catching up on return. Reduced motion fixes animal and roller poses
while retaining the slow volume display. Hidden floors/distant viewpoints skip
visual updates; lower tiers update at most four times per second.

Shared low-poly geometry and materials, static instancing and merged animal parts
limit rendering cost. There are no dynamic lights, shadows, glass transmission,
reflection probes, textured foliage or new GI systems. Guppies have bright fan
tails, Kuhli loaches have alternating bands, shrimp have red legs and antennae,
and snails have shell centres and broad feet. The monstera uses split lobes with
geometric gaps. An open-front aquarium cutaway preserves readability.

The group is registered before miniature construction. The production-geometry
miniature consumes it without running its controller or recursively building
another miniature. The fallback proxy retains the same tank/rack/plant arrangement.
Regenerate the miniature manifest when reconciling shared scene changes.

## Reference and verification

Decorative sponge filter, thermometer, light bar and logbook cues come from the
[DSPACE aquaria quests](https://github.com/democratizedspace/dspace/tree/main/frontend/src/pages/quests/json/aquaria)
(`sponge-filter`, `thermometer`, `aquarium-light`, `log-water-parameters`). Quest
mechanics, instructions and real-world settings are not imported.

`src/scene/structures/__tests__/aquiloop.test.ts` uses accelerated deterministic
time for phase boundaries, 100 repeated cycles, conservation, capacity and the
20% clamp; it also checks suspension/resume, collisions, approach, existing
furniture, repository routing, reduced motion, culling and geometry budgets.
No test waits five real minutes.
