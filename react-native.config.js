/**
 * React Native CLI configuration.
 *
 * `assets` tells `npx react-native-asset` (and `react-native link-assets`)
 * which folders of fonts/images to copy into native iOS/Android projects
 * at link time. We ship every bundled react-native-vector-icons font so
 * anywhere in the app that imports from
 * `react-native-vector-icons/<Family>` (Feather, FontAwesome, etc.) works
 * on-device without having to rerun pod install / gradle for each new
 * family we start using.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
};
