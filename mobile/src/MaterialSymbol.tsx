import Svg, { Path, type SvgProps } from "react-native-svg";
import symbols from "./icons/material-rounded.json";
import { palette } from "./theme";

export type SymbolName = keyof typeof symbols;
export type SymbolProps = Omit<SvgProps, "color"> & {
  size?: number;
  color?: string;
  filled?: boolean;
};

/** Official Google Material Symbols Rounded, bundled locally as SVG paths. */
export default function MaterialSymbol({ name, size = 24, color = palette.brown, filled = false, fill, strokeWidth: _strokeWidth, ...props }: SymbolProps & { name: SymbolName }) {
  const selected = filled || (fill !== undefined && fill !== "none");
  const glyph = symbols[name][selected ? "filled" : "outline"];
  return <Svg {...props} width={size} height={size} viewBox={glyph.viewBox} accessible={false}>
    {glyph.paths.map((d, index) => <Path key={index} d={d} fill={color} />)}
  </Svg>;
}
