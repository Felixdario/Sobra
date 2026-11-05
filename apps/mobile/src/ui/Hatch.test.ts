import { hatchTilePath } from './Hatch';

describe('hatchTilePath', () => {
  it('draws the 45° diagonal and the corner pieces that join neighbouring tiles', () => {
    expect(hatchTilePath(8)).toBe('M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6');
  });
});
