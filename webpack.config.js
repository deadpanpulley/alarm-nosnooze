const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Customize the config for better web support
  
  // Use the web-specific entry point
  config.entry = [
    path.resolve(__dirname, 'src/web/index.tsx')
  ];
  
  // Add resolve aliases for web-specific modules
  config.resolve.alias = {
    ...config.resolve.alias,
    // Add any web-specific aliases here if needed
  };
  
  // Add fallbacks for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    'crypto': require.resolve('crypto-browserify'),
    'stream': require.resolve('stream-browserify'),
    'path': require.resolve('path-browserify'),
    'fs': false,
    'net': false,
    'tls': false
  };
  
  return config;
};
