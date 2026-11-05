import { darkTheme, lightTheme } from '@financas/tokens';
import appJson from '../../app.json';

describe('app.json', () => {
  it('splash e fundo nativo usam o chão dos tokens (app.json não importa TS)', () => {
    const splash = appJson.expo.plugins.find(
      (
        plugin,
      ): plugin is [string, { backgroundColor: string; dark: { backgroundColor: string } }] =>
        Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );
    expect(appJson.expo.backgroundColor).toBe(lightTheme.colors.bg.canvas);
    expect(splash?.[1].backgroundColor).toBe(lightTheme.colors.bg.canvas);
    expect(splash?.[1].dark.backgroundColor).toBe(darkTheme.colors.bg.canvas);
  });
});
