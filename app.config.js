// app.config.js
const config = {
  name: "Alarmy",
  slug: "alarmy",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.advickbhalla.alarmy"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.advickbhalla.alarmy",
    googleServicesFile: "./google-services.json"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    eas: {
      projectId: "eedd97c4-f211-4b8d-977f-f72e8c1b7dd4"
    }
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          kotlinVersion: "1.9.24",
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: "34.0.0",
          extraProguardRules: "-keep class com.google.android.gms.internal.consent_sdk.** { *; }"
        }
      }
    ],
    "expo-camera"
  ]
};

export default config; 