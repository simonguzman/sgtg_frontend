// Extraemos tu configuración actual intacta a una constante base
const commonConfig = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  transform: {
    '^.+\\.(ts|js|mjs|html)$': [
      'jest-preset-angular',
      {
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|primeng|@angular)'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
  }
};

export default {
  // Le decimos a Jest que ahora maneja múltiples "proyectos"
  projects: [
    {
      displayName: 'unit',
      ...commonConfig, // Hereda todo lo de Angular/PrimeNG
      // Ignora la carpeta node_modules y cualquier archivo que termine en .integration.spec.ts
      testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$'],
    },
    {
      displayName: 'integration',
      ...commonConfig, // Hereda todo lo de Angular/PrimeNG
      // Ejecuta ÚNICAMENTE los archivos que terminen en .integration.spec.ts
      testMatch: ['**/*.integration.spec.ts'],
    }
  ]
};
