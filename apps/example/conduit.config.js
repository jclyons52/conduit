const config = {
  outputDir: './src/generated',
  entryPoints: [
    {
      outputFile: 'user-service-container.ts',
      entryPoint: './src/services',
      typeName: 'AppServices',
      mode: 'container',
    },
  ],
  servicesFile: './src/services.ts',
};

module.exports = config;
