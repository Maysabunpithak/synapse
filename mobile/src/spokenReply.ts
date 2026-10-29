type SpeechEngine = {
  stop: () => Promise<void>;
  speak: (text: string, options: {
    language: string; rate: number; pitch: number; volume: number;
    onError: () => void;
    onDone?: () => void;
    onStopped?: () => void;
  }) => void;
};

const MAX_SPEECH_WAIT_MS = 10_000;

// Keep delayed speech and error callbacks from a previous command off the screen.
export function createSpokenReply(engine: SpeechEngine, display: (text: string) => void, speaking: (active: boolean) => void = () => {}) {
  let generation = 0;
  let complete: (() => void) | undefined;
  let playbackTimer: ReturnType<typeof setTimeout> | null = null;

  function clearPlaybackTimer() {
    if (playbackTimer) clearTimeout(playbackTimer);
    playbackTimer = null;
  }

  async function stop() {
    generation++;
    speaking(false);
    complete?.();
    complete = undefined;
    clearPlaybackTimer();
    await engine.stop().catch(() => {});
  }

  async function reply(text: string, waitForEnd = false) {
    complete?.();
    complete = undefined;
    clearPlaybackTimer();
    const id = ++generation;
    display(text);
    const failed = () => {
      if (id === generation) {
        speaking(false);
        display(text + "\nเปิดเสียงตอบกลับไม่ได้ กรุณาตรวจเสียงลำโพงและเสียงภาษาไทยในการตั้งค่าเครื่อง");
      }
    };
    try {
      await engine.stop();
      if (id !== generation) return;
      const playback = new Promise<void>((resolve) => {
        let active = true;
        const done = () => {
          if (!active) return;
          active = false;
          if (id === generation) speaking(false);
          clearPlaybackTimer();
          if (complete === done) complete = undefined;
          resolve();
        };
        complete = done;
        // A platform speech engine can fail to call onDone. Never leave the
        // assistant stuck in an acknowledging state because of that callback.
        if (waitForEnd)
          playbackTimer = setTimeout(() => {
            void engine.stop().catch(() => {});
            done();
          }, MAX_SPEECH_WAIT_MS);
        try {
          speaking(true);
          engine.speak(text, {
            language: "th-TH", rate: 0.85, pitch: 1, volume: 1,
            onDone: done, onStopped: done, onError: () => {
              if (active) failed();
              done();
            },
          });
        } catch {
          failed();
          done();
        }
      });
      if (waitForEnd) await playback;
    } catch { failed(); }
  }
  return { reply, stop };
}
