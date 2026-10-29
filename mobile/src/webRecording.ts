export type WebRecording = { stop: () => Promise<Blob>; discard: () => void; getMetering: () => number | undefined };

export async function startWebRecording(
  isActive: () => boolean,
): Promise<WebRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  let context: AudioContext | undefined;
  let input: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
  let samples: Float32Array<ArrayBuffer> | undefined;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    stream.getTracks().forEach((track) => track.stop());
    try { input?.disconnect(); analyser?.disconnect(); } catch { /* Already disconnected. */ }
    if (context) void context.close().catch(() => {});
  };
  if (!isActive()) {
    release();
    throw new Error("Recording cancelled");
  }
  try {
    // Analyse the same stream without connecting the microphone to speakers.
    // Unsupported metering uses the hook's bounded automatic capture fallback.
    try {
      const Context = globalThis.AudioContext || (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Context) {
        context = new Context();
        void context.resume().catch(() => {});
        input = context.createMediaStreamSource(stream);
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        samples = new Float32Array(analyser.fftSize);
        input.connect(analyser);
      }
    } catch {
      try { input?.disconnect(); analyser?.disconnect(); } catch { /* Meter unavailable. */ }
      if (context) void context.close().catch(() => {});
      context = undefined;
      analyser = undefined;
    }
    const mimeType = ["audio/webm", "audio/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined,
    );
    const chunks: Blob[] = [];
    let complete: (blob: Blob) => void = () => {};
    let fail: (error: Error) => void = () => {};
    const result = new Promise<Blob>((resolve, reject) => {
      complete = resolve;
      fail = reject;
    });
    // A discarded recording has no awaiting consumer.
    void result.catch(() => {});
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      release();
      complete(
        new Blob(chunks, {
          type: recorder.mimeType || mimeType || "audio/webm",
        }),
      );
    };
    recorder.onerror = () => {
      release();
      fail(new Error("บันทึกเสียงไม่สำเร็จ กรุณาลองใหม่"));
    };
    recorder.start();
    return {
      getMetering() {
        if (released || context?.state !== "running" || !analyser || !samples) return undefined;
        try {
          analyser.getFloatTimeDomainData(samples);
          let power = 0;
          for (const sample of samples) power += sample * sample;
          const rms = Math.sqrt(power / samples.length);
          return Math.max(-160, 20 * Math.log10(Math.max(rms, 1e-8)));
        } catch { return undefined; }
      },
      stop() {
        if (recorder.state !== "inactive") recorder.stop();
        release();
        return result;
      },
      discard() {
        if (recorder.state !== "inactive") recorder.stop();
        release();
      },
    };
  } catch (error) {
    release();
    throw error;
  }
}
