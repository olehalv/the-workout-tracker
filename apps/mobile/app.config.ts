import type { ConfigContext, ExpoConfig } from "expo/config";

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
