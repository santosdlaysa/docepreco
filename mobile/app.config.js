module.exports = ({ config }) => {
  const plugins = [...(config.plugins || [])];

  // Xcode 26 requires every CocoaPods target to declare iOS 15 or newer.
  // Several third-party podspecs still declare older versions, so normalize
  // their generated build settings during Expo prebuild.
  plugins.push(require('./plugins/withIosPodsDeploymentTarget'));

  return { ...config, plugins };
};
