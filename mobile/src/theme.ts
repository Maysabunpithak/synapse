import { Platform } from "react-native";

export const palette = {
  sand: "#BA9A81",
  brown: "#3F2305",
  muted: "rgba(63,35,5,0.60)",
  orange: "#E8BA8C",
  yellow: "#D8B563",
  paper: "#F8F5F1",
  white: "#FFFFFF",
  line: "#BA9A8140",
  cream: "#F7EFE5",
  sandSurface: "#F1E6DE",
  roomFrame: "#D8C3AB",
  primary: "#79583F",
  glass: "rgba(255,250,244,0.94)",
  backdrop: "rgba(63,35,5,0.38)",
  rail: "#DDD2C7",
  lightGlow: "#F3D9AE",
  fanOff: "#B6A99C",
};

export const headingFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

export const authFont = Platform.select({
  ios: "Times New Roman",
  android: "serif",
  default: "Times New Roman",
});
