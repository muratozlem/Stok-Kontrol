const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.blockList = [
  /node_modules\/@react-native\/community-cli-plugin\/.*/,
  /node_modules\/@react-native\/dev-middleware\/.*/,
  /node_modules\/@react-native\/debugger-frontend\/.*/,
];

config.watchFolders = [__dirname];

module.exports = config;
