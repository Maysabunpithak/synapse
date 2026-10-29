const test = require("node:test");
const assert = require("node:assert/strict");
const { startWebRecording } = require("../src/webRecording.ts");

function mockMicrophone(t, { denied = false, broken = false, metering = false } = {}) {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const oldRecorder = Object.getOwnPropertyDescriptor(
    globalThis,
    "MediaRecorder",
  );
  const oldContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  let amplitude = 0;
  let contextClosed = false;
  let inputDisconnected = false;
  if (metering) Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: class {
    state = "running";
    async resume() {}
    async close() { contextClosed = true; this.state = "closed"; }
    createMediaStreamSource() { return { connect() {}, disconnect() { inputDisconnected = true; } }; }
    createAnalyser() { return { fftSize: 2048, getFloatTimeDomainData(samples) { samples.fill(amplitude); }, disconnect() {} }; }
  } });
  const track = {
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  let created = 0;
  class Recorder {
    static isTypeSupported(type) {
      return type === "audio/webm";
    }
    constructor() {
      if (broken) throw new Error("Recorder failed");
      created++;
      this.state = "inactive";
      this.mimeType = "audio/webm";
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      queueMicrotask(() => {
        this.ondataavailable({ data: new Blob(["sample-audio"]) });
        this.onstop();
      });
    }
  }
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          if (denied) throw new Error("Permission denied");
          return { getTracks: () => [track] };
        },
      },
    },
  });
  Object.defineProperty(globalThis, "MediaRecorder", {
    configurable: true,
    value: Recorder,
  });
  t.after(() => {
    if (oldNavigator)
      Object.defineProperty(globalThis, "navigator", oldNavigator);
    else delete globalThis.navigator;
    if (oldRecorder)
      Object.defineProperty(globalThis, "MediaRecorder", oldRecorder);
    else delete globalThis.MediaRecorder;
    if (oldContext) Object.defineProperty(globalThis, "AudioContext", oldContext);
    else delete globalThis.AudioContext;
  });
  return { track, created: () => created, setAmplitude: value => { amplitude = value; }, contextClosed: () => contextClosed, inputDisconnected: () => inputDisconnected };
}

test("stopping captures audio and releases microphone tracks immediately", async (t) => {
  const fake = mockMicrophone(t);
  const recording = await startWebRecording(() => true);
  const done = recording.stop();
  assert.equal(fake.track.stopped, true);
  const blob = await done;
  assert.equal(blob.type, "audio/webm");
  assert.equal(await blob.text(), "sample-audio");
  assert.equal(await recording.stop(), blob);
});

test("web speech followed by silence submits without a second tap and closes audio analysis", async (t) => {
  const { createSilenceDetector } = require('../src/voiceSilence.ts');
  const fake = mockMicrophone(t, { metering: true });
  const recording = await startWebRecording(() => true);
  const detect = createSilenceDetector(0);
  fake.setAmplitude(0.05);
  assert.equal(detect(recording.getMetering(), 100), 'listen');
  assert.equal(detect(recording.getMetering(), 400), 'listen');
  fake.setAmplitude(0);
  assert.equal(detect(recording.getMetering(), 1000), 'listen');
  assert.equal(detect(recording.getMetering(), 1600), 'send');
  const result = await recording.stop();
  assert.ok(result.size > 0);
  assert.equal(fake.track.stopped, true);
  assert.equal(fake.contextClosed(), true);
  assert.equal(fake.inputDisconnected(), true);
  assert.equal(recording.getMetering(), undefined);
});

test("discard also releases the metering audio context", async (t) => {
  const fake = mockMicrophone(t, { metering: true });
  const recording = await startWebRecording(() => true);
  recording.discard();
  assert.equal(fake.track.stopped, true);
  assert.equal(fake.contextClosed(), true);
});
test("discard closes microphone, including cancellation while permission was pending", async (t) => {
  const fake = mockMicrophone(t);
  await assert.rejects(
    startWebRecording(() => false),
    /cancelled/,
  );
  assert.equal(fake.created(), 0);
  assert.equal(fake.track.stopped, true);
  fake.track.stopped = false;
  const recording = await startWebRecording(() => true);
  recording.discard();
  assert.equal(fake.track.stopped, true);
});
test("denied permissions and recorder startup errors propagate without leaving an open microphone", async (t) => {
  await t.test("denied", async (child) => {
    mockMicrophone(child, { denied: true });
    await assert.rejects(
      startWebRecording(() => true),
      /Permission denied/,
    );
  });
  await t.test("startup failed", async (child) => {
    const fake = mockMicrophone(child, { broken: true });
    await assert.rejects(
      startWebRecording(() => true),
      /Recorder failed/,
    );
    assert.equal(fake.track.stopped, true);
  });
});
