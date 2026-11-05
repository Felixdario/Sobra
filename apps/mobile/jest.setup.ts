import 'react-native-gesture-handler/jestSetup';
import { setUpTests } from 'react-native-reanimated';

setUpTests();

/*
 * The device language decides the app's language before sign-in. Tests start from a pt-BR
 * device (the signed-in user's preference from GET /me wins once it arrives); a test can switch
 * with `jest.mocked(getLocales).mockReturnValue(...)`.
 */
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'pt-BR', languageCode: 'pt', regionCode: 'BR' }]),
}));
