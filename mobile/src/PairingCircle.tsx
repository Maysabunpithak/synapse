import { palette as C } from './theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Plug, Wifi } from "./SynapseIcons";

type Props = {
  label: string;
  icon?: "plug" | "wifi" | "check";
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
};

/** One obvious action; the same circle becomes a status indicator while pairing. */
export default function PairingCircle({ label, icon = "plug", onPress, disabled = false, busy = false }: Props) {
  const Icon = icon === "wifi" ? Wifi : icon === "check" ? Check : Plug;
  const contents = <>
    <Icon size={42} color={onPress ? C.white : C.brown} strokeWidth={1.7} />
    <Text style={[styles.label, onPress && styles.actionLabel]}>{label}</Text>
    {busy && <ActivityIndicator color={C.brown} style={styles.spinner} />}
  </>;
  return <View style={styles.halo}>
    {onPress ? <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.circle, styles.action, disabled && styles.disabled, pressed && styles.pressed]}
    >{contents}</Pressable> : <View accessibilityRole="text" accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.circle}>{contents}</View>}
  </View>;
}

const styles = StyleSheet.create({
  halo: { alignSelf: "center", padding: 12, marginVertical: 22, borderRadius: 140, borderWidth: 1, borderColor: C.line, backgroundColor: C.cream },
  circle: { width: 174, height: 174, borderRadius: 87, alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: C.sandSurface, padding: 14 },
  action: { backgroundColor: C.brown },
  label: { color: C.brown, textAlign: "center", fontSize: 16, fontWeight: "700" },
  actionLabel: { color: C.white },
  disabled: { backgroundColor: C.sand },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  spinner: { marginTop: 1 },
});
