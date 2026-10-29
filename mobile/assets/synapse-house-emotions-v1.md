# Expressive house companion

Built-in Imagegen produced `synapse-house-emotions-v1.png` (3 × 3 poses) and `synapse-house-happy-walk-body-v1.png` (articulated walking body).

Cells: cheerful, sleepy/resting, asleep, waking, listening, thinking, speaking, delighted, apologetic/confused. houseExpression maps actual voice states. SynapsePose crossfades changes. Rightward walking has bright eyes and a smile; leftward walking keeps its cool expression. Success uses the delighted pose with bounce/sway. Sleep retains drool.

## Atlas prompt

Use case: identity-preserve. Create a 3 columns by 3 rows sprite atlas, exactly nine equal SQUARE cells, overall square canvas. Match the reference cream living HOUSE with orange pitched roof and cream chimney, thin cream arms with mitten hands, thin sandy legs and brown shoes. Same architecture, proportions, soft 3D shading and three-quarter facing right. NOT a robot. Every cell one entire house character centered on identical anchor, consistent scale, 10% safe margins, no clipping. Sunglasses lowered just beneath eyes in ALL frames so facial expressions are clearly visible; keep glasses as identity accessory. Faces MUST be different and expressive, with eyes, brows and mouth. No speech bubbles, hearts, stars, sparkles, text, labels or decorations. Genuine transparent alpha background.
Row1 left-right: (0) standing cheerful welcoming, bright eyes small warm smile; (1) seated resting, half-closed droopy eyes and a sleepy little yawn, hands resting; (2) seated peacefully asleep, eyes fully closed, relaxed tiny open mouth on lower front/right cheek, no baked-in drool, hands resting and bent legs same sleeping posture as reference.
Row2 left-right: (3) waking up stretching arms, wide bright eyes and refreshed smile; (4) attentive listening, one hand cupped near side of house, raised eyebrows and interested soft smile; (5) thinking, hand at chin, eyes glance upward, one eyebrow raised, small thoughtful mouth.
Row3 left-right: (6) speaking pleasantly, eyes engaged, open smiling mouth as if talking, one hand gestures outward; (7) joyful success, happy crescent eyes with wide grin, both hands raised, knees bent ready to dance; (8) mild apologetic confusion, worried raised inner eyebrows, gentle small frown, palms turned up. Friendly, not distressed. Exactly nine cells with same character and consistent camera.

## Walking-body prompt

Use case: precise-object-edit. Change ONLY the facial expression on this exact house body cutout: slide the brown sunglasses slightly down to reveal cheerful dark eyes with relaxed friendly eyebrows, and make a playful warm smiling mouth. Preserve exact roof, chimney, cream walls, proportions, camera angle, size and framing. NO arms, hands, legs or feet. Output same single limbless house body on true transparent alpha. No sparkles, no stars, no text, no ground. Keep the same silhouette and lower wall edge so this can replace the original image on a walking animation rig.

