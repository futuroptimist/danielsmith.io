# Basement woodworking corner

The static workshop occupies plan X -13.5 to -8 and Z -15.7 to -12.4,
at basement elevation -5. Horizontal plan coordinates scale by two. Keep other
exhibits, including any future aquarium, outside this reservation. Placement is
centralized in `src/scene/level/woodworkingLayout.ts`; existing museum furniture,
art and career interaction anchors remain in place. The west and south perimeter
routes and the central stair approach stay open.

The project stages draw from the [DSPACE woodworking quests](https://github.com/democratizedspace/dspace/tree/main/frontend/src/pages/quests/json/woodworking):
birdhouse shell awaiting roof assembly; bookshelf carcass with loose shelves;
picture frame clamped during assembly; slatted planter with an unfinished side;
stool side frames awaiting their top. Two benches and a hanging tool rack tie
the projects together. The band saw and drill press are inert display props.

Two primitive geometries and five shared rough materials serve instanced batches.
Balanced/cinematic tiers add hand tools and clamps, removed beyond 45 world units
by LOD. Other tiers retain the recognizable project silhouettes. Every batch
has computed bounds for frustum culling; no lights, textures, timers or animated
machinery are added. The whole build belongs to the basement structure group for
floor-aware visibility. Five height-bounded station colliders contain the visible
geometry. A screen-reader paragraph describes the projects. Disposal releases
shared resources once and removes the description.

Regression tests cover all tiers, project silhouettes, geometry containment,
triangle/resource budgets, distance LOD, teardown, career interaction anchors,
stairs and perimeter routes with walking and conservative running envelopes.
For visual review, use `?mode=immersive&disablePerformanceFailover=1` and navigate
to the basement. Check the corner from both the stairs and the west perimeter;
switch floors and detail tiers. CI owns the launch screenshot.

The property miniature captures the workshop from its production floor group.
The far LOD starts hidden so the initial snapshot includes each station once.
The miniature manifest classifies the workshop as shared source geometry.
