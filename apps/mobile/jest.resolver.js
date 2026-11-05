// Same rules as react-native-reanimated/jest/resolver (and the worklets resolver it wraps), but
// matching package directories instead of substrings. On Linux pnpm names the virtual store folder
// `react-native-reanimated@x_react-native-worklets@y_…`, so the upstream `includes('react-native-
// worklets')` check matched every Reanimated file and loaded its web modules (window.matchMedia).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest loads resolvers as CommonJS
const path = require('node:path');

const WEB_ONLY_IN_JEST = new Set([
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
  'useAnimatedRef',
  'useAnimatedStyle',
  'WorkletEventHandler',
  'JSPropsUpdater',
  'updateProps',
  'util',
  'css/component/AnimatedComponent',
]);

function insidePackage(basedir, name) {
  const segment = `${path.sep}node_modules${path.sep}${name}${path.sep}`;
  return `${basedir}${path.sep}`.includes(segment) || basedir.split(path.sep).includes(name);
}

function withoutNative(options) {
  return { ...options, extensions: options.extensions?.filter((ext) => !ext.includes('native')) };
}

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const basename = request.split('/').pop();
  const isWebOnly = [...WEB_ONLY_IN_JEST].some((entry) =>
    entry.includes('/') ? request.endsWith(entry) : basename === entry,
  );
  if (
    request.startsWith('.') &&
    isWebOnly &&
    insidePackage(options.basedir, 'react-native-reanimated')
  ) {
    return options.defaultResolver(request, withoutNative(options));
  }
  if (
    insidePackage(options.basedir, 'react-native-worklets') ||
    request.startsWith('react-native-worklets')
  ) {
    return options.defaultResolver(request, withoutNative(options));
  }
  return options.defaultResolver(request, options);
};

module.exports.insidePackage = insidePackage;
module.exports.sep = path.sep;
