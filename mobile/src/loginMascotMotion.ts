const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const LOGIN_STORY_DURATION = 33600;
const beat = (time: number, start: number, hold: number, end: number, rise = 700) =>
  smooth((time - start) / rise) * (1 - smooth((time - hold) / (end - hold)));
const pulse = (time: number, start: number, duration: number) => {
  const t = Math.max(0, Math.min(1, (time - start) / duration));
  return t === 0 || t === 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};
export function loginMascotMotion(elapsed: number, enabled = true) {
  const time = enabled ? elapsed % LOGIN_STORY_DURATION : 0;
  const progress = smooth(Math.min(time / 4600, 1));
  const walk = 0;
  const inspect = enabled ? smooth((time - 4700) / 800) * (1 - smooth((time - 7100) / 800)) : 0;
  const laugh = enabled ? smooth((time - 7800) / 650) * (1 - smooth((time - 10100) / 700)) : 0;
  const pose = enabled ? smooth((time - 8000) / 900) * (1 - smooth((time - 10200) / 1100)) : 0;
  const surprise = pulse(time, 6400, 1400);
  const wave = beat(time, 11900, 14300, 15200);
  const notice = beat(time, 17700, 21600, 23700, 1000);
  const comfort = beat(time, 19900, 22600, 24400, 1300);
  const celebrate = beat(time, 24800, 26900, 27900, 900);
  const bow = beat(time, 28300, 29600, 30800, 900);
  const present = beat(time, 30900, 31700, 33000);
  // Frontal side-to-side groove and raised pointing hand, inspired by the video.
  const dance = Math.max(beat(time, 0, 3700, 4600, 650), beat(time, 11000, 14800, 15900, 850), celebrate);
  const dancePhase = time / 1200 * Math.PI * 2;
  const phrase = time < 4600 ? time : time < 15900 ? time - 11000 : time - 24800;
  const leftRaise = smooth((phrase - 1700) / 650);
  const rightRaise = smooth((phrase - 650) / 650);
  const sway = Math.sin(dancePhase) * dance;
  const angle = progress * Math.PI * 2;
  return {
    walk, laugh, inspect, pose, surprise, wave, bow, present, notice, comfort, celebrate,
    dance, danceSway: sway * 4, danceTilt: sway * 3,
    danceDip: (1 - Math.cos(dancePhase * 2)) * 1.8 * dance,
    danceLeft: Math.max(0, Math.sin(dancePhase)) ** 2 * dance,
    danceRight: Math.max(0, -Math.sin(dancePhase)) ** 2 * dance,
    danceHandX: 28 + Math.sin(dancePhase) * 11,
    danceHandY: 131 - leftRaise * 62 + Math.cos(dancePhase * 2) * 6,
    danceRightX: 176 + Math.sin(dancePhase + 0.5) * 6,
    danceRightY: 130 - rightRaise * 44 + Math.cos(dancePhase * 2) * 5,
    dancePoint: leftRaise * dance,
    waveSwing: wave * Math.sin((time - 12600) / 190),
    expression: Math.max(laugh, wave * 0.8, present, celebrate),
    gaitTime: progress * 4600,
    x: 0,
    y: 0,
    lean: 0,
  };
}

export function palmBulbMotion(elapsed: number, enabled = true) {
  if (!enabled) return { x: 0, bob: 0, stride: 0, leftLift: 0, rightLift: 0, jump: 0, squash: 0, wave: 0, glow: 0, lean: 0, dim: 0 };
  const time = elapsed % LOGIN_STORY_DURATION;
  const walking = 1 - smooth((time - 4600) / 1100) * (1 - smooth((time - 30900) / 2200));
  const jump = pulse(time, 6200, 1050) * 13 + pulse(time, 25000, 1100) * 8;
  const dim = beat(time, 16200, 22400, 24400, 1600);
  const bow = beat(time, 28700, 29800, 30900, 900);
  const squash = pulse(time, 5870, 330) * 0.16 + pulse(time, 7250, 380) * 0.13 + bow * 0.12;
  const wave = Math.max(beat(time, 7600, 10000, 10650, 350), beat(time, 12400, 14400, 15300), beat(time, 26100, 27000, 28000));
  const half = Math.floor(time / 2800);
  const t = (time % 2800) / 2800;
  const progress = (1 - Math.cos(t * Math.PI)) / 2;
  const travel = half * 10 + progress * 10;
  const phase = travel / 10 * Math.PI * 2;
  const speed = Math.sin(t * Math.PI) * walking;
  return {
    x: (half % 2 ? 5 - progress * 10 : -5 + progress * 10) * walking,
    bob: -Math.abs(Math.sin(phase)) * 0.55 * speed,
    stride: Math.sin(phase) * 1.8 * speed,
    leftLift: Math.max(0, Math.sin(phase)) * 2 * speed,
    rightLift: Math.max(0, -Math.sin(phase)) * 2 * speed,
    jump, squash, wave: wave * (0.7 + 0.3 * Math.sin(time / 140)),
    glow: (0.04 + pulse(time, 6100, 1800) * 0.18 + wave * 0.08
      + beat(time, 22700, 27000, 28200, 1800) * 0.23) * (1 - dim),
    lean: bow * 12, dim,
  };
}
