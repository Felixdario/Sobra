import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('mostra o nome do app', async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'Sobra' })).toBeTruthy();
  });
});
