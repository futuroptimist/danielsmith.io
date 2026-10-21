# Gamepad controls

The immersive scene accepts controllers that the browser exposes through
`navigator.getGamepads()` with `mapping === 'standard'`. This includes supported
Xbox, PlayStation and generic controllers; device names do not determine mappings.
Bluetooth and USB use the same API. No Web Bluetooth permission or pairing workflow
is needed by the site.

| Control                                              | Action                                   |
| ---------------------------------------------------- | ---------------------------------------- |
| Left stick or D-pad                                  | Camera-relative movement                 |
| Right stick                                          | Camera pan; release to recenter          |
| Left / right trigger (L2 / R2 on PlayStation)        | Zoom out / in                            |
| Bottom face button (A on Xbox, Cross on PlayStation) | Nearby door, seat or exhibit interaction |

Open **Controls** in the HUD for the dedicated **Gamepad controls** category.
Focus the scene, press a controller button to expose the device to the browser,
then release buttons and center both sticks. A radial 20% stick dead zone removes
small drift while preserving analog travel. The first supported pad is selected;
it remains selected until disconnected. Replacement devices must return to neutral.

Input stops on blur, hidden tabs, disconnect, text/UI focus and open controls, settings or exhibit
panels. The tutorial permits scene input when the scene has focus. Return to the scene and release controls before resuming. Interactions fire
once per press. Keyboard, mouse, touchscreen, remapped keys and text mode remain
available; use those controls for menus and links. The controller never generates
keyboard events or triggers browser navigation. Unknown mappings, unavailable APIs
and policy-denied access leave controller actions inactive.

## Browser support and sources

- [W3C Gamepad working draft](https://www.w3.org/TR/gamepad/) defines the standard
  axes and positional buttons, nullable device slots and mapping rules.
- [MDN getGamepads](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads)
  documents broad browser availability and `SecurityError` when Permissions Policy
  blocks access.
- [MDN usage guide](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
  explains polling, connection events and user activation with the page focused.

API availability does not guarantee a particular controller/OS/browser combination
or Bluetooth transport mapping. Serve over HTTPS (localhost for development).
Unsupported layouts are deliberately not guessed. Haptics, adaptive triggers,
touchpad gestures and platform/system buttons are outside this implementation.

## Validation

Vitest fixtures model standard generic, Xbox and DualSense pads, analog input,
button edges, focus/visibility/disconnect neutralization and unsupported mappings.
The browser smoke test injects synthetic gamepads; it does **not** validate Bluetooth,
drivers, hardware recognition or physical button labels.

Before claiming physical-device support, manually check an already connected pad
in each target OS/browser: activation, all mappings, diagonal movement, drift,
held interaction, pan/zoom bounds, text/menu focus, tab switching, disconnect and
reconnect. Record the controller, connection transport, OS and browser versions.
Confirm existing keyboard, pointer, touch and text alternatives remain usable.
No physical Bluetooth validation has been performed as part of these tests.
