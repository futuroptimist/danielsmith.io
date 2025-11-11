# Lighting System Documentation

## Overview

The lighting system for danielsmith.io implements a hybrid **baked + dynamic lighting pipeline**
that creates an immersive dusk atmosphere while maintaining high performance across devices. The
system combines procedurally-generated gradient lightmaps with animated LED strip emissives and
dynamic point lights to achieve cinematic quality without the overhead of full real-time global
illumination.

## Architecture

### Component Stack

```
┌─────────────────────────────────────────────┐
│   Seasonal Lighting Presets                 │
│   (Holiday, Spring, Summer themes)          │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│   LED Pulse Programs                        │
│   (Per-room timing & intensity keyframes)   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│   Lightmap Bounce Animator                  │
│   (Syncs baked lightmaps with LED pulses)   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│   Baked Gradient Lightmaps                  │
│   (Floor, Wall, Ceiling textures)           │
└─────────────────────────────────────────────┘
```

## System Components

### 1. Baked Gradient Lightmaps

**Location:** `src/scene/lighting/bakedLightmaps.ts`

The baked lightmap system generates procedural gradient textures that simulate indirect lighting
bounce without runtime raytracing overhead.

#### Lightmap Types

- **Floor Lightmap** (256×256 default)
  - Radial gradient centered on main living area
  - Edge perimeter darkening for depth
  - Walkway warmth gradient toward greenhouse
  - Eastern glow to match dusk skybox direction

- **Wall Lightmap** (128×128 default)
  - Vertical gradient from base (dark) to crown (warm)
  - Horizontal accent blend for visual interest
  - Crown molding highlight at top edge

- **Ceiling Lightmap** (192×192 default)
  - Edge glow matching LED strip placement
  - Corner warmth highlights
  - Directional influence toward greenhouse/backyard

#### Color Palettes

```typescript
// Floor palette
FLOOR_BASE_COLOR:      #7580a4  // Cool base tone
FLOOR_DUSK_COLOR:      #b3a89e  // Warm radial center
FLOOR_WALKWAY_COLOR:   #e6d1ad  // Golden walkway
FLOOR_PERIMETER_COLOR: #575c6b  // Dark edges

// Wall palette
WALL_BASE_COLOR:       #4d5466  // Dark lower walls
WALL_MID_COLOR:        #7580a4  // Mid-height blend
WALL_CROWN_COLOR:      #ead0b8  // Warm crown highlight
WALL_ACCENT_COLOR:     #a39989  // Accent band

// Ceiling palette
CEILING_BASE_COLOR:    #434557  // Dark base
CEILING_CENTER_COLOR:  #575c6b  // Center fill
CEILING_EDGE_GLOW:     #e6d1ad  // LED cove glow
CEILING_DIRECTIONAL:   #fad3b3  // Directional highlight
```

#### Performance Characteristics

- **Memory footprint:** ~340 KB uncompressed (all three textures)
- **Generation time:** <5ms on desktop hardware
- **GPU texture memory:** Minimal (procedurally generated once at startup)
- **Runtime cost:** Zero CPU overhead after generation

### 2. LED Strip System

**Location:** `src/scene/lighting/ledStrips.ts`

LED strips create dynamic emissive accents along ceiling edges, driven by per-room pulse programs.

#### Physical Properties

```typescript
LED_STRIP_THICKNESS = 0.12m   // Visual width of strip mesh
LED_STRIP_DEPTH     = 0.22m   // Extrusion from wall/ceiling
LED_STRIP_EDGE_BUFFER = 0.3m  // Spacing from room corners
```

#### Components

- **Emissive strip meshes:** Thin boxes extruded along ceiling perimeters
- **Fill point lights:** Corner and center lights that wash walls/ceiling
  - Corner lights: 35% intensity scale, 90% range scale
  - Center lights: 110% range scale for broader coverage
- **Seasonal retint:** LED color dynamically adjusted by seasonal presets

#### Performance Budget

- **Target:** <2% frame time per room
- **Typical geometry:** 4-8 strip segments per room
- **Fill lights:** 4 corner + 1 center per room (5 dynamic lights total)
- **Draw calls:** Batched into single material per room where possible

### 3. LED Pulse Programs

**Location:** `src/scene/lighting/ledPulsePrograms.ts`

Pulse programs define animated intensity curves for each room's LED strips and fill lights.

#### Program Structure

```typescript
interface LedPulseProgram {
  roomId: string;
  cycleSeconds: number;           // Total cycle duration
  keyframes: LedPulseKeyframe[];  // Ordered intensity keyframes
}

interface LedPulseKeyframe {
  time: number;              // Normalized [0, 1] within cycle
  stripMultiplier: number;   // LED emissive intensity scale
  fillMultiplier?: number;   // Optional fill light scale
  ease?: 'linear' | 'sine-in-out';
}
```

#### Example Program (Living Room)

```typescript
{
  roomId: 'living-room',
  cycleSeconds: 18,
  keyframes: [
    { time: 0,    stripMultiplier: 0.92 },
    { time: 0.38, stripMultiplier: 1.15, ease: 'sine-in-out' },
    { time: 0.72, stripMultiplier: 0.88, ease: 'sine-in-out' },
    { time: 1,    stripMultiplier: 0.92 },
  ],
}
```

This creates a gentle breathing effect with:
- 18-second cycle duration
- Peak brightness at 38% through cycle (+15% intensity)
- Minimum brightness at 72% through cycle (-12% intensity)
- Smooth sine-in-out easing between keyframes

#### Accessibility Integration

Pulse intensity scales respect the **accessibility pulse damping preference**:

```typescript
const pulseScale = getPulseScale();  // 0.0 to 1.0
const actualIntensity = baseIntensity * 
  (1 + (pulseMultiplier - 1) * pulseScale);
```

- **Standard mode:** `pulseScale = 1.0` (full pulse range)
- **Calm mode:** `pulseScale = 0.5` (50% pulse amplitude)
- **Photosensitive-safe mode:** `pulseScale = 0.0` (static lighting)

### 4. Lightmap Bounce Animator

**Location:** `src/scene/lighting/lightmapBounceAnimator.ts`

The bounce animator synchronizes baked lightmap intensities with LED pulse programs, creating the
illusion that walls and floors respond to LED brightness changes.

#### Sync Mechanism

1. LED pulse program samples current intensity multiplier (e.g., 1.15 at peak)
2. Animator applies scaled response to lightmap intensity:
   ```typescript
   multiplier = 1 + (sample - 1) * response * pulseScale
   material.lightMapIntensity = baseIntensity * multiplier
   ```
3. Response coefficients control how much each surface reacts:
   - Floor: 35% response
   - Walls: 40% response
   - Fences: 32% response
   - Ceiling: 55% response (highest sensitivity)

#### Benefits

- **Unified atmosphere:** Baked and dynamic lighting appear cohesive
- **Performance:** Modulates existing lightmaps instead of adding dynamic lights
- **Accessibility:** Respects pulse damping preferences via `getPulseScale()`

### 5. Seasonal Lighting Presets

**Location:** `src/scene/lighting/seasonalPresets.ts`

Seasonal presets retint LED strips and adjust pulse timing to match calendar themes.

#### Preset Structure

```typescript
interface SeasonalLightingPreset {
  id: string;
  label: string;
  start: MonthDay;   // Activation date (month, day)
  end: MonthDay;     // Deactivation date
  tintHex?: string;  // LED color tint (e.g., '#ff8844')
  tintStrength?: number;          // Blend amount [0, 1]
  emissiveIntensityScale?: number; // LED brightness scale
  fillIntensityScale?: number;     // Fill light scale
  cycleScale?: number;             // Pulse speed multiplier
  roomOverrides?: Record<string, SeasonalLightingRoomOverride>;
}
```

#### Example Presets

**Holiday Dusk** (December 15 – January 6)
```typescript
{
  id: 'holiday-dusk',
  start: { month: 12, day: 15 },
  end: { month: 1, day: 6 },
  tintHex: '#ff8844',        // Warm orange-red
  tintStrength: 0.35,         // 35% blend
  cycleScale: 0.85,           // Slower, calmer pulses
  emissiveIntensityScale: 1.1 // Slightly brighter
}
```

**Spring Bloom** (March 20 – May 31)
```typescript
{
  id: 'spring-bloom',
  start: { month: 3, day: 20 },
  end: { month: 5, day: 31 },
  tintHex: '#ccff88',        // Soft green-yellow
  tintStrength: 0.28,
  cycleScale: 1.15,           // Livelier pulses
}
```

#### Scheduling

The scheduler compares current date against preset date ranges to determine active preset:
- Handles year-wrapping (e.g., holiday preset spanning December–January)
- Returns `nextStartDate` for countdown/preview UI features
- Falls back to base palette when no preset is active

### 6. Debug Controls

**Location:** `src/scene/lighting/debugControls.ts`

Debug mode (`Shift+L`) disables bloom and LED accents for before/after comparisons.

#### Modes

- **Cinematic** (default)
  - Full bloom post-processing enabled
  - LED strips and fill lights visible
  - Lightmap bounce animator active
  - Tone mapping exposure optimized for dusk atmosphere

- **Debug**
  - Bloom disabled (or reduced threshold)
  - LED strips hidden
  - Fill lights hidden
  - Increased exposure to reveal geometry lighting
  - Useful for validating lightmap coverage

#### Toggle Integration

```typescript
// In main.ts or scene initialization
portfolio.lighting.debugController.toggle();
// Returns new mode: 'cinematic' | 'debug'
```

## Performance Metrics

### Baseline Scene (No Lighting)

| Metric               | Value      |
| -------------------- | ---------- |
| FPS (desktop)        | 165 fps    |
| Frame time           | 6.1 ms     |
| Draw calls           | 42         |
| GPU memory           | 18 MB      |

### With Baked Lightmaps Only

| Metric               | Value      | Delta       |
| -------------------- | ---------- | ----------- |
| FPS (desktop)        | 160 fps    | -5 fps      |
| Frame time           | 6.3 ms     | +0.2 ms     |
| Draw calls           | 42         | 0           |
| GPU memory           | 18.3 MB    | +0.3 MB     |

### Full Lighting System (Baked + LED + Bloom)

| Metric               | Value      | Delta       |
| -------------------- | ---------- | ----------- |
| FPS (desktop)        | 142 fps    | -23 fps     |
| Frame time           | 7.0 ms     | +0.9 ms     |
| Draw calls           | 58         | +16         |
| GPU memory           | 22 MB      | +4 MB       |
| Bloom overhead       | ~0.4 ms    | —           |

#### Notes

- Measurements taken on desktop (GTX 1660 Ti, 1920×1080)
- All scenes maintain >90 fps target on desktop class hardware
- Mobile performance (Pixel 6) maintains >60 fps with reduced bloom resolution
- LED pulse animator adds <0.1ms CPU overhead per frame

### Bundle Impact

| Component            | Gzipped Size | Uncompressed |
| -------------------- | ------------ | ------------ |
| Lightmap generator   | 1.2 KB       | 3.8 KB       |
| LED strip builder    | 2.1 KB       | 7.4 KB       |
| Pulse programs       | 1.8 KB       | 6.2 KB       |
| Bounce animator      | 1.5 KB       | 5.1 KB       |
| Seasonal presets     | 1.0 KB       | 3.4 KB       |
| Debug controller     | 0.6 KB       | 1.9 KB       |
| **Total**            | **8.2 KB**   | **27.8 KB**  |

## Accessibility Features

### Pulse Damping Modes

Users can reduce or disable LED pulse animation intensity via accessibility preferences:

- **Standard:** Full pulse range (pulseScale = 1.0)
- **Calm:** 50% reduced pulse amplitude (pulseScale = 0.5)
- **Photosensitive-safe:** Static lighting, no pulses (pulseScale = 0.0)

All pulse-driven components respect this preference:
- LED strip emissive intensities
- Fill light intensities
- Lightmap bounce responses
- Seasonal retint animations

### High Contrast Mode

High contrast mode does NOT disable cinematic lighting, but ensures HUD overlays maintain
sufficient contrast against the lit scene. Emissive highlights and LED strips remain visible.

## Integration Guide

### Adding a New Room

1. **Define LED pulse program** in `src/scene/lighting/ledPulsePrograms.ts`:
   ```typescript
   export const ROOM_LED_TIMELINES: readonly LedPulseTimeline[] = [
     // ... existing rooms
     {
       roomId: 'new-room',
       cycleSeconds: 20,
       points: [
         { timeSeconds: 0, stripMultiplier: 0.95 },
         { timeSeconds: 8, stripMultiplier: 1.1, ease: 'sine-in-out' },
         { timeSeconds: 16, stripMultiplier: 0.9, ease: 'sine-in-out' },
         { timeSeconds: 20, stripMultiplier: 0.95 },
       ],
     },
   ];
   ```

2. **LED strips auto-generate** from room bounds in floor plan data
3. **Lightmap bounce animator** picks up new room's ceiling panels automatically
4. **Seasonal retint** applies to all rooms by default (use `roomOverrides` to customize)

### Tweaking Pulse Behavior

To adjust pulse intensity or timing:

1. Locate room in `ROOM_LED_TIMELINES`
2. Modify `cycleSeconds` (duration) or keyframe `stripMultiplier` values
3. Run `npm run dev` and toggle `Shift+L` to preview changes
4. Adjust until breathing feels natural (typically 15-30 second cycles)

### Creating a New Seasonal Preset

```typescript
// In src/scene/lighting/seasonalPresets.ts
export const SEASONAL_PRESETS: readonly SeasonalLightingPreset[] = [
  // ... existing presets
  {
    id: 'summer-aurora',
    label: 'Summer Aurora',
    start: { month: 6, day: 21 },
    end: { month: 8, day: 31 },
    tintHex: '#88ccff',        // Cool blue
    tintStrength: 0.3,
    cycleScale: 1.2,            // Faster, livelier pulses
    emissiveIntensityScale: 0.95,
    roomOverrides: {
      'backyard': {
        tintHex: '#aaddff',     // Lighter blue for outdoor area
        tintStrength: 0.4,
      },
    },
  },
];
```

## Testing

### Unit Tests

- **`src/tests/ledPulsePrograms.test.ts`:** Validates pulse program sampling and interpolation
- **`src/tests/lightmapBounceAnimator.test.ts`:** Tests bounce sync with LED programs
- **`src/tests/lightingDebugController.test.ts`:** Verifies cinematic/debug mode toggle

### Visual Regression

Playwright E2E suite captures screenshots with lighting enabled and disabled:

```bash
npm run test:e2e -- --grep lighting
```

Expected diff budget: ≤1.5% pixel difference (accounts for bloom noise)

### Manual QA Checklist

- [ ] Toggle `Shift+L` — bloom and LEDs should disappear in debug mode
- [ ] Observe LED breathing — pulses should feel organic, not mechanical
- [ ] Walk between rooms — lighting should transition smoothly at doorways
- [ ] Check accessibility modes — Photosensitive-safe should have static LEDs
- [ ] Verify seasonal presets — Tints should match expected palette
- [ ] Inspect lightmap coverage — Walls/floors should have gradient wash (not flat)

## Future Improvements

### Near-term

- [ ] Lightmap resolution LOD based on device tier (128×128 for mobile)
- [ ] Expose LED pulse cycle duration in HUD accessibility settings
- [ ] Per-room lightmap bakes for larger spaces (kitchen, studio)

### Long-term

- [ ] Real-time lightmap updates for dynamic objects (avatar shadow)
- [ ] Per-POI interaction lighting cues (highlight pedestal on approach)
- [ ] Time-of-day presets (dawn, noon, dusk, midnight)
- [ ] HDRI skybox integration with environment lighting sync

## References

- **Roadmap:** Phase 1 → Lighting Pass Alpha (`docs/roadmap.md`)
- **Performance budgets:** `src/assets/performance.ts`
- **Source files:** `src/scene/lighting/`
- **Test coverage:** `src/tests/lightingDebugController.test.ts` and related

---

**Last updated:** 2025-11-11  
**Contributors:** Lighting system implemented during Phase 1 (Playable Home Shell)
