const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withDangerousMod,
  withProjectBuildGradle,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const pluginVersion = "1.0.0";
const permissions = [
  "android.permission.ACCESS_WIFI_STATE",
  "android.permission.CHANGE_WIFI_STATE",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.NEARBY_WIFI_DEVICES",
  "android.permission.BLUETOOTH_SCAN",
  "android.permission.BLUETOOTH_CONNECT",
];

function projectRoot(config) {
  return config._internal?.projectRoot || process.cwd();
}

function tuyaSdkRoot(config) {
  return path.resolve(projectRoot(config), "..", "private", "tuya-sdk", "android", "7.8.0");
}

function getAndroidCredentials(config) {
  const credentialsPath = path.resolve(projectRoot(config), "..", "private", "tuya-sdk", "credentials.json");
  if (!fs.existsSync(credentialsPath)) {
    throw new Error("Tuya credentials are missing. Expected private/tuya-sdk/credentials.json.");
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const android = credentials.android || {};
  if (!android.appKey || !android.appSecret) {
    throw new Error("Tuya Android appKey and appSecret are required in private/tuya-sdk/credentials.json.");
  }
  return android;
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Tuya SDK resource directory is missing: ${source}`);
  }
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

function ensureNamedElement(elements, name, attributes = {}) {
  const current = elements || [];
  const existing = current.find((element) => element.$?.["android:name"] === name);
  if (existing) Object.assign(existing.$, attributes);
  else current.push({ $: { "android:name": name, ...attributes } });
  return current;
}

const withTuyaAndroid = (config) => {
  config = withProjectBuildGradle(config, (gradleConfig) => {
    const repositories = [
      "    maven { url 'https://maven-other.tuya.com/repository/maven-releases/' }\n",
      "    maven { url 'https://maven-other.tuya.com/repository/maven-commercial-releases/' }\n",
      "    maven { url 'https://maven-other.tuya.com/repository/maven-snapshots/' }\n",
    ];
    if (!gradleConfig.modResults.contents.includes("maven-other.tuya.com/repository/maven-snapshots")) {
      const allProjectsRepositories = "allprojects {\n  repositories {\n";
      if (!gradleConfig.modResults.contents.includes(allProjectsRepositories)) {
        throw new Error("Unable to find allprojects.repositories in the Android build file.");
      }
      gradleConfig.modResults.contents = gradleConfig.modResults.contents.replace(
        allProjectsRepositories,
        `${allProjectsRepositories}${repositories.join("")}`,
      );
    }
    return gradleConfig;
  });

  config = withAndroidManifest(config, (manifestConfig) => {
    const manifest = manifestConfig.modResults.manifest;
    manifest["uses-permission"] = permissions.reduce(
      (items, permission) => ensureNamedElement(items, permission),
      manifest["uses-permission"] || [],
    );

    const application = manifest.application?.[0];
    if (!application) throw new Error("AndroidManifest.xml has no application element.");
    const credentials = getAndroidCredentials(manifestConfig);
    application["meta-data"] = (application["meta-data"] || []).filter(
      (element) => !["TUYA_SMART_APPKEY", "TUYA_SMART_SECRET"].includes(element.$?.["android:name"]),
    );
    application["meta-data"] = ensureNamedElement(application["meta-data"], "THING_SMART_APPKEY", {
      "android:value": credentials.appKey,
    });
    application["meta-data"] = ensureNamedElement(application["meta-data"], "THING_SMART_SECRET", {
      "android:value": credentials.appSecret,
    });
    return manifestConfig;
  });

  return withDangerousMod(config, ["android", async (androidConfig) => {
    const sourceRoot = tuyaSdkRoot(androidConfig);
    const mainSourceSet = path.join(androidConfig.modRequest.platformProjectRoot, "app", "src", "main");
    copyDirectory(path.join(sourceRoot, "assets"), path.join(mainSourceSet, "assets"));
    copyDirectory(path.join(sourceRoot, "res"), path.join(mainSourceSet, "res"));
    return androidConfig;
  }]);
};

module.exports = createRunOncePlugin(withTuyaAndroid, "with-tuya-android", pluginVersion);
