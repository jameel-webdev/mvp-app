module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        [
          'module-resolver',
          {
            root: ['./'], // Or ['./src'] if all aliases are within src
            extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
            alias: {
              // These should match the "paths" in your tsconfig.json (without the "/*")
              "@components": "./src/components",
              "@screens": "./src/screens",
              "@services": "./src/services",
              "@navigation": "./src/navigation",
              "@types": "./src/types",
              "@utils": "./src/utils",
              "@hooks": "./src/hooks",
              "@assets": "./assets" // Example for assets folder at root
              // Add other aliases here if needed
            }
          }
        ],
        ["module:react-native-dotenv", {
          "moduleName": "@env",
          "path": ".env",
          "blacklist": null,
          "whitelist": null,
          "safe": false,
          "allowUndefined": true
        }],
        // Add other plugins here, e.g., 'react-native-reanimated/plugin' if you use Reanimated
      ]
    };
  };