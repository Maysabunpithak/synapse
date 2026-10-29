import {
  requireOptionalNativeModule,
  type EventEmitter,
} from "expo-modules-core";

export type TuyaSdkStatus = {
  initialized: boolean;
  nativeBuild: boolean;
};

export type TuyaHome = {
  homeId: number;
  name: string;
};

export type TuyaPairingProgress = { step: string };
export type TuyaPairingSuccess = { deviceId: string; name: string };
export type TuyaPairingError = { code: string; message: string };

type TuyaDevicePairingModule = {
  initialize(): Promise<TuyaSdkStatus>;
  getStatus(): TuyaSdkStatus;
  sendRegistrationCode(countryCode: string, email: string): Promise<{ sent: boolean }>;
  registerWithEmail(countryCode: string, email: string, password: string, code: string): Promise<{ registered: boolean }>;
  loginWithEmail(
    countryCode: string,
    email: string,
    password: string,
  ): Promise<{ loggedIn: boolean }>;
  listHomes(): Promise<TuyaHome[]>;
  createHome(name: string): Promise<TuyaHome>;
  startEzPairing(
    homeId: number,
    ssid: string,
    password: string,
  ): Promise<{ started: boolean; timeoutSeconds: number }>;
  stopPairing(): { stopped: boolean };
} & InstanceType<
  EventEmitter<{
    onPairingProgress: (event: TuyaPairingProgress) => void;
    onPairingSuccess: (event: TuyaPairingSuccess) => void;
    onPairingError: (event: TuyaPairingError) => void;
  }>
>;

// Expo Go intentionally returns null: Tuya requires a custom Android build.
export default requireOptionalNativeModule<TuyaDevicePairingModule>(
  "TuyaDevicePairing",
);
