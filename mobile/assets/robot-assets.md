# User-provided Synapse robot

## Current version

`RobotPlay.tsx` adds direct touch play while no voice session is active: the character follows a finger within bounded travel, leans toward it, reacts happily to stroking, and bounces on a tap. Releasing springs it back to the center and clears the reaction after 1.6 seconds. Responder cancellation, voice activation, and motion preference/lifecycle changes reset the interaction. The touch target is limited to the character so the surrounding screen remains scrollable. Reduced motion retains the expression/text feedback without gesture transforms; screen readers can invoke the play action.

`robot-emotions-v3.png` is a 1536 × 1024 six-expression atlas created with imagegen from the revised mascot. Equal 512-pixel cells run left to right: idle, listening, thinking, speaking, success, error. `RobotStage.tsx` clips the corresponding cell and softly masks its edges. No manual bitmap extraction is needed.

`RobotMotion` supplies distinct float, tilt and bounce rhythms for each state. The rotating amber ring speeds up while processing. All motion stops for reduced-motion preference or when the app enters the background. This is a 2D animated character using 3D-rendered artwork, not a realtime 3D mesh.

Expressions follow actual capture, command outcome and speech playback. Successful commands briefly show the happy pose; demo commands never claim device success. Playback completion, failure and cancellation reset the speaking signal. The bottom microphone remains the sole conversation control.

`robot-refined-v2.png` is retained as the preceding mascot version. It keeps the house-shaped head, orange/cream palette and Synapse name. The original files below also remain unchanged.

- `robot-ready.png`: exact copy of the user's `2 1.png`.
- `robot-welcome.png`: exact copy of the user's `1 1 (1).png`.

Both are original 1920 × 1080 transparent PNG files provided for the earlier assistant screen and retained as source references.

The screen's orbit rings are native SVG decoration. Floating and scanning respect the app's reduced-motion and foreground settings; scanning runs only during an active session. Reference: [AI Palm Reading by Igor Savelev](https://dribbble.com/shots/26954730-AI-Palm-Reading-App-Home-Loading-Screen-iOS-UI-Design).
