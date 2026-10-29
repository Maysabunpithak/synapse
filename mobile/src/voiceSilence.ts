// Require sustained sound before treating a quiet interval as the end of speech.
export function createSilenceDetector(startedAt: number) {
  let candidate: number | null = null;
  let lastSound = startedAt;
  let heardSpeech = false;
  let receivedMetering = false;
  const recentSound: number[] = [];
  let speechLevel = -48;
  return (db: number | undefined, now: number): "listen" | "send" | "empty" => {
    if (typeof db === "number" && Number.isFinite(db)) {
      receivedMetering = true;
      // Native Android reports peak amplitude, so a fan can remain above an
      // absolute threshold even after speech stops. Track sustained speech
      // strength and also recognise a 12 dB drop back to ambient sound.
      const threshold = Math.max(-48, speechLevel - 12);
      if (db >= threshold) {
        candidate ??= now;
        recentSound.push(db);
        if (recentSound.length > 3) recentSound.shift();
        if (recentSound.length === 3) {
          speechLevel = Math.max(speechLevel, recentSound.reduce((sum, level) => sum + level, 0) / 3);
        }
        if (now - candidate >= 250) {
          heardSpeech = true;
        }
        lastSound = now;
      } else {
        candidate = null;
        recentSound.length = 0;
        if (heardSpeech && now - lastSound >= 1200) return "send";
      }
    }
    // Some devices/browsers cannot expose levels. Submit a short capture anyway;
    // transcription still must return nonempty text before any device command.
    if (!receivedMetering && now - startedAt >= 8000) return "send";
    if (receivedMetering && !heardSpeech && candidate === null && now - startedAt >= 12000) return "empty";
    return "listen";
  };
}
