import MaterialSymbol, { type SymbolName } from "./MaterialSymbol";

const names = { light: "lightbulb", fan: "mode_fan", plug: "outlet", power: "power_settings_new" } satisfies Record<string, SymbolName>;

type Props = {
  kind: keyof typeof names;
  size: number;
  color: string;
  active?: boolean;
};

export default function DeviceGlyph({ kind, size, color, active = false }: Props) {
  return <MaterialSymbol name={names[kind]} size={size} color={color} filled={active} />;
}
