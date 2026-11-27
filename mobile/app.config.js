module.exports = ({ config }) => {
  const plugins = [...(config.plugins || [])];

  // Xcode 26 requires every CocoaPods target to declare iOS 15 or newer.
  // Several third-party podspecs still declare older versions, so normalize
  // their generated build settings during Expo prebuild.
  plugins.push(require('./plugins/withIosPodsDeploymentTarget'));
  plugins.push('@bacons/apple-targets');

  const appGroupsKey = 'com.apple.security.application-groups';
  const entitlements = config.ios?.entitlements || {};
  const appleTeamId = process.env.EXPO_APPLE_TEAM_ID || config.ios?.appleTeamId;
  return {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      ...(appleTeamId ? { appleTeamId } : {}),
      entitlements: {
        ...entitlements,
        [appGroupsKey]: [...new Set([
          ...(entitlements[appGroupsKey] || []),
          `group.${config.ios.bundleIdentifier}.saleswidget`,
        ])],
      },
    },
  };
};
