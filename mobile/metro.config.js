const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude non-existent Android Gradle plugin build dirs that cause ENOENT on Windows
config.resolver.blockList = [
  /node_modules[/\\]expo-modules-autolinking[/\\]android[/\\].*/,
];

module.exports = config;
