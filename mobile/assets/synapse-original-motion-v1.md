# Original Synap companion motion

The active companion uses the original orange/cream, roof-headed Synap robot
from `synapse-robot-still.png`, adapted with feet for the existing walking behavior.
Both new assets were generated with the built-in Imagegen tool. Original source
images and house artwork are retained.

- `synapse-original-walk-body-v1.png`: transparent head/torso cutout. `HouseWalk.tsx`
  supplies articulated orange limbs and cream feet using `houseGait.ts`, with
  opposite half-cycles, grounded support, and opposite arm swing.
- `synapse-original-activities-v1.png`: transparent 4 × 4 atlas. Cells 8–11 are
  awake, seated rest, asleep, and waking. Cells 12–15 form the success dance.
  The generated walking cells 0–7 are unused; code controls alternating steps.

The existing activity timing, left/right travel, touch-to-talk, sleep after 47
seconds, success window, reduced-motion and background suspension are preserved.
`SynapsePose.tsx` animates only the success dance and releases its timer on cleanup.

## Final prompts

### Activity atlas

Use case: identity-preserve. Create a production 4 by 4 animation sprite atlas, exactly 16 equal square cells on a 2048x2048 truly transparent canvas. Reference is the ORIGINAL Synapse robot: preserve its orange roof-shaped head, circular ivory cross window, cream face frame, dark brown screen with two warm glowing oval eyes, orange round torso with cream chest and small "Synapse" inscription, orange upper arms and cream mitten hands. Match the soft 3D material and proportions from reference. Adapt this same robot to walking with TWO short articulated orange-and-cream legs and rounded cream shoes instead of the hover nozzle. No house walls, no sunglasses. Keep exact character identity, same scale and camera throughout. Each cell is 512x512, character centered x=256, standing feet baseline y=460, top of roof around y=55; all limbs remain within 40..472. No backgrounds, no gradients behind character, no grid or labels.
Row 1 and row 2 together: 8 sequential smooth walking cycle frames in row-major order, robot facing slightly toward the right, torso upright and nearly front so chest text remains readable. Frame 0 left foot trailing and right foot forward on ground; 1 left shoe visibly lifted and advancing, right foot planted; 2 left foot forward airborne and right foot trailing planted; 3 left foot landing in front; 4 opposite of frame 0; 5 right shoe lifted advancing with left planted; 6 right forward airborne; 7 right landing. Arms swing opposite to legs. Feet MUST visibly alternate, not two feet jumping together.
Row 3: four states left to right: standing awake smiling with both feet grounded; seated resting with bent knees and relaxed arms; seated asleep with eyes closed and head gently bowed; waking/stretching with arms raised and eyes open.
Row 4: four consecutive dancing poses, leaning left and raising right hand, front with both hands up, leaning right and raising left hand, front with hands low and knees bent. Happy crescent eyes. Keep enough clearance to avoid clipping. Output only the sprite atlas.

### Walking torso

Use case: precise-object-edit. Make an animation rig torso cutout of the original Synapse orange cream robot in the reference. Preserve EXACT original roof head with round cross window, dark screen two glowing oval eyes, cream border, orange rounded body and cream chest with "Synapse". Remove both arms, hands, hover nozzle and any legs completely, reconstruct clean torso sides and bottom. Only head and torso as one upright centered single character, straight-on view slightly three-quarter right, no tilt. Transparent alpha background absolutely clean, no glow outside silhouette, no shadow, no texture outside robot. Tight framing character occupies 88% of canvas width and 92% height. Soft 3D material same as original. This image will be combined with separately animated arms and legs.

