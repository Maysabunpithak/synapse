import { pathLength, type CaretakerLeg } from './caretakerPath';
/** Start at the completed leg's endpoint and follow already validated paths. */
export function routeToRoomActivity(route: readonly CaretakerLeg[], completed: number, targetId: string): CaretakerLeg[] | null {
  const ordered = [...route.slice(completed + 1), ...route.slice(0, completed + 1)];
  const target = ordered.findIndex(leg => leg.targetId === targetId);
  if (target < 0) return null;
  const path = ordered.slice(0, target + 1).flatMap((leg, index) => index ? leg.path.slice(1) : leg.path);
  const destination = ordered[target];
  return [{ ...destination, path, length: pathLength(path) }, ...ordered.slice(target + 1)];
}
