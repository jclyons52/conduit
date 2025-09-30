import { getContainer } from '../src/index';

describe('Smoke Tests', () => {
  test('should instantiate the app without errors', async () => {
    const container = getContainer();

    const app = container.app;
    expect(app).toBeDefined();
  });
});
