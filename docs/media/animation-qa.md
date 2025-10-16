# Animation QA Checklist

This checklist documents the contact alignment and footstep synchronization work that
ships with the mannequin avatar. Each item links to the automated validation and notes
how to capture a quick visual clip for regressions.

## Foot contact alignment

- [x] **IK offsets settle on sampled surfaces** – `createAvatarFootIkController` now emits a
      contact event whenever a foot's offset converges on the sampled stair or floor height. Vitest
      coverage lives in `src/tests/avatarFootIkController.test.ts` under "emits contact events when a
      foot settles onto a sampled surface". Run `npm run test:ci` after changes touching the IK
      controller.
- Capture tip: open the immersive preview via
  `http://localhost:5173/?mode=immersive&disablePerformanceFailover=1`, enable the developer HUD
  overlay, and record a short clip while walking the stairs so the feet rest on each tread.

## Footstep audio sync

- [x] **Footfall notifications trigger audio** – the footstep controller exposes `notifyFootfall`,
      which is invoked from the IK contact event handler. Unit tests in
      `src/tests/footstepAudioController.test.ts` cover stereo panning for left/right contacts and guard
      against airborne spam.
- Capture tip: with the preview running, enable spatial audio in the HUD, walk a short loop over
  ramps and floor transitions, and record system audio to show the alternating stereo hits lining
  up with the planted feet.

Store captured media alongside this doc (e.g., `docs/media/animation-qa-footfalls.mp4`) when
updating the footage. Keep clips under 15 seconds so they remain review-friendly.
