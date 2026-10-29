# Articulated house walk

Body asset: `synapse-house-walk-body-v1.png`.

Generated using the built-in Imagegen tool from `synapse-house-poster-hq.png`. This clean body cutout retains the house identity while the code draws and animates separate shaded arms, hands, legs, and feet. `HouseWalk.tsx` renders the rig at 30 updates per second; `houseGait.ts` makes the legs half a cycle apart, includes a short double-support landing, raises the swinging foot, and moves each arm opposite its same-side leg. The whole rig is mirrored for leftward travel. Idle rest, sleep, touch-to-talk, and success-only dance retain their existing behavior.

The generated sprite sheet's former walking cells are no longer used. `scripts/preview-house-walk.cjs` renders the actual frame component to an MP4 review artifact in `tmp/house-walk-review/walking-left-right.mp4`.

## Final Imagegen prompt

Create a clean animation rig BODY CUTOUT of the reference character, matching it exactly. The reference is a cream living house, orange pitched roof with cream chimney, dark brown sunglasses and subtle smile, three-quarter facing right. Preserve its exact architecture, face, sunglasses, materials, proportions, orange/cream colors and 3D shading. REMOVE ALL arms, ALL hands, ALL legs and ALL feet cleanly, including their attachment stubs. Reconstruct smooth cream walls at the former arm attachment points. Output ONLY the house body including roof, chimney, face and sunglasses. No limbs anywhere, no floating body parts, no ground, no shadow, no scenery, no text. True transparent alpha background. A single centered square image with the limbless house occupying roughly 90% of image width and 88% of image height, only a small even transparent margin. Keep a level upright posture, do not tilt or change the house into a robot. This will be composited over separately animated limbs so the complete clean lower wall edge and side wall edges must be visible.

