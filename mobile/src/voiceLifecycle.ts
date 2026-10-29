export function shouldCancelVoiceOnAppState(
  state: string,
  stage: string,
  requestingPermission: boolean,
): boolean {
  // Android's microphone permission activity can temporarily background the app.
  // This exception ends before recording starts; background recording is never allowed.
  if (stage === "permission" && requestingPermission) return false;
  return state === "background" || state === "inactive";
}
