const { withPodfile } = require('@expo/config-plugins');

const deploymentTarget = '15.1';
const marker = 'post_install do |installer|';
const settings = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
      end
    end`;

module.exports = function withIosPodsDeploymentTarget(config) {
  return withPodfile(config, (podfileConfig) => {
    const { contents } = podfileConfig.modResults;

    if (!contents.includes(marker)) {
      throw new Error('Unable to set the iOS deployment target: Podfile post_install hook was not found.');
    }

    if (!contents.includes("build_settings['IPHONEOS_DEPLOYMENT_TARGET']")) {
      podfileConfig.modResults.contents = contents.replace(marker, `${marker}${settings}`);
    }

    return podfileConfig;
  });
};
