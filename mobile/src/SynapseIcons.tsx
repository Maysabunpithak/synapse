import MaterialSymbol, { type SymbolName, type SymbolProps } from "./MaterialSymbol";

function symbol(name: SymbolName) {
  const Icon = (props: SymbolProps) => <MaterialSymbol name={name} {...props} />;
  Icon.displayName = name;
  return Icon;
}

export const ArrowLeft = symbol("arrow_back");
export const ArrowRight = symbol("arrow_forward");
export const ChevronDown = symbol("expand_more");
export const ChevronRight = symbol("chevron_right");
export const Plus = symbol("add");
export const X = symbol("close");
export const Check = symbol("check");
export const House = symbol("home");
export const LayoutGrid = symbol("grid_view");
export const ChartNoAxesCombined = symbol("monitoring");
export const Clock3 = symbol("schedule");
export const Settings = symbol("settings");
export const UserRound = symbol("person");
export const Bell = symbol("notifications");
export const Mail = symbol("mail");
export const LockKeyhole = symbol("lock");
export const Info = symbol("info");
export const Globe2 = symbol("language");
export const Wifi = symbol("wifi");
export const Moon = symbol("bedtime");
export const Monitor = symbol("desktop_windows");
export const BookOpen = symbol("menu_book");
export const DoorClosed = symbol("door_front");
export const DoorOpen = symbol("door_open");
export const Sparkles = symbol("auto_awesome");
export const Mic = symbol("mic");
export const Lightbulb = symbol("lightbulb");
export const Plug = symbol("outlet");
