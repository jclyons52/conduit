/**
 * Conduit configuration file
 * @type {import('./compiler/config-loader').ConduitConfig}
 */
const config = {
  entryPoints: [
    {
      outputFile: 'user-service-container.ts',
      entryPoint: './src/example/services.ts',
      typeName: 'AppServices',
    },
  ],
};

module.exports = config;
