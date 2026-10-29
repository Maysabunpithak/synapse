# Synap with original torso and arms

`synapse-reference-awake-v1.png` is an exact copy of the user's `2 1.png`.
It keeps the original round orange/cream torso, arms, hands, fingers and lower
hover nozzle. There are no legs. `SynapsePose.tsx` frames the original wide image
with an SVG viewBox rather than editing the source bitmap. Text is never mirrored.

`synapse-reference-sleep-v1.png` is the sleeping-eye variant created using built-in
Imagegen. It retains the arms and hover nozzle. The existing float, sleep,
wake, touch-to-talk and celebration behaviors remain active.

All mobile companion states, the summary mascot, the legacy HouseWalk entry
point and the Next.js dashboard now use this same reference identity.
Previous artwork is retained as source history but is not loaded by these views.

## Final Imagegen prompt

Use case: precise-object-edit. Edit the supplied exact orange cream Synapse floating robot. Change ONLY the two glowing open oval eyes into gently curved closed sleeping eyelids. Preserve EVERYTHING else including the rounded torso, BOTH orange arms, cream palms and dark rounded fingers, orange conical hover nozzle under torso, roof head, small circular cross window, chest text 'Synapse', original camera tilt, pose, materials, proportions and surrounding small golden sparkles. NO legs or feet. Do NOT remove arms or hands. Keep exact original wide 16:9 canvas composition, character size and position with its generous transparent margins. Genuine transparent alpha background. One robot, same image with sleeping eyes only.
