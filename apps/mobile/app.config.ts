import type { ConfigContext, ExpoConfig } from "expo/config";

// Xcode rejects an app-store export whose entitlement carries
// iCloudContainerEnvironment "Development" ("value is not allowed"), so the
// store build has to say Production — and CloudKit's two environments are
// separate databases, so anything but a store build must stay on Development.
const iCloudContainerEnvironment =
  process.env.ICLOUD_CONTAINER_ENVIRONMENT === "Production" ? "Production" : "Development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    [
      "react-native-cloud-storage",
      {
        iCloudContainerEnvironment,
        iCloudContainerIdentifier: "iCloud.dev.olehalv.theworkouttracker",
      },
    ],
  ],
});
