# Synapse house companion

Source: user-provided `156275-812085326.mp4` (8.6 seconds, 25 fps, 215 frames).

The success dance comes directly from that video. The separate idle walking/resting/sleeping poses are documented in `synapse-house-activities-v1.md`. `scripts/recolor-house-video.cjs` recolors green roof pixels to warm orange, walls to cream, feet to sand, and dark glasses to brown while preserving shading. It replaces the cyan backdrop with the assistant card's `#3F2305`. Color selection is hue-based, not a 3D material edit.

The crop includes the union of the character's bounds across all 215 frames with padding, so leaning poses remain inside the image. Timing and frame order are preserved. The last frame loops directly back to the first, as supplied; no invented transition is added.

- `synapse-house-dance-hq.gif`: 600 × 600 looping animation used in the mobile app, replacing the original 400 × 400 GIF.
- `synapse-house-poster-hq.png`: 600 × 600 still shown for reduced motion, background state, loading or decode failure.
- `synapse-house-dance-hq.mp4`: 720 × 720 H.264 preview (CRF 16) with the same recoloring and movement.

The higher-resolution version decodes the source at 1280 × 720 (previously 640 × 360) before recoloring. Frames are processed individually to bound memory use. This preserves more source detail rather than enlarging the old GIF. The app still uses GIF's 256-color palette, while the MP4 preview preserves smoother color gradations. The old files are retained for comparison but are no longer referenced by the assistant.

`src/RobotDance.tsx` uses React Native Image; Android already enables animated GIF decoding in `android/gradle.properties` and `android/app/build.gradle`. No extra native dependency is needed. The old robot assets are retained but no longer used in the assistant stage. Voice-state labels reflect the actual session. Only a confirmed successful command enables the dance for an 8.6-second window; old success results do not restart it when reopening the screen. Listening, processing, replies, and errors use attentive poses; idle time selects walking, rest, and sleep.

Voice input uses `HoldToTalk.tsx`: hold the house for 350 ms, wait for the recording label, speak, then release to submit one command. Moving outside the house, losing the touch, backgrounding, or leaving the screen cancels the recording. Releasing while permission/setup is pending cancels the pending capture; after granting permission for the first time, hold again. Capture stops at 30 seconds and does not automatically reopen after a reply. The bottom assistant tab only navigates. Screen readers can invoke the start/send and cancel accessibility actions.

Rebuild from the original video with:

```powershell
node mobile/scripts/recolor-house-video.cjs 'C:\Users\Maysa\Downloads\156275-812085326.mp4' '<path-to-ffmpeg.exe>'
```
