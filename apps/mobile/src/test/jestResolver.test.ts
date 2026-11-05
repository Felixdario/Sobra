// eslint-disable-next-line @typescript-eslint/no-require-imports
const resolver = require('../../jest.resolver.js') as ((
  request: string,
  options: object,
) => string) & {
  insidePackage: (basedir: string, name: string) => boolean;
  sep: string;
};

const store = (folder: string, pkg: string, ...rest: string[]) =>
  ['', 'repo', 'node_modules', '.pnpm', folder, 'node_modules', pkg, ...rest].join(resolver.sep);

describe('jest resolver', () => {
  // Linux pnpm keeps peer names in the folder; Windows shortens it to a hash.
  const linuxReanimated = store(
    'react-native-reanimated@4.7.1_react-native-worklets@0.13.0_abc',
    'react-native-reanimated',
    'lib',
    'module',
    'animation',
  );

  it('matches the package directory, not the pnpm folder name', () => {
    expect(resolver.insidePackage(linuxReanimated, 'react-native-reanimated')).toBe(true);
    expect(resolver.insidePackage(linuxReanimated, 'react-native-worklets')).toBe(false);
  });

  it('keeps native extensions for regular Reanimated modules on Linux paths', () => {
    let extensions: string[] | undefined;
    resolver('../ReducedMotion', {
      basedir: linuxReanimated,
      extensions: ['.native.js', '.js'],
      defaultResolver: (_: string, options: { extensions?: string[] }) => {
        extensions = options.extensions;
        return 'resolved';
      },
    });
    expect(extensions).toEqual(['.native.js', '.js']);
  });
});
