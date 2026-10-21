// A configuração Google para iOS precisa do URL scheme criado no Google Cloud.
// Mantê-lo no ambiente permite que o projeto continue configurável antes de a
// credencial de produção ser criada, sem colocar um identificador falso no build.
module.exports = ({ config }) => {
  // This is a public OAuth redirect identifier (not a secret).  Keep a
  // production fallback because the URL scheme is compiled into Info.plist;
  // an EAS build without the environment variable would otherwise ship an iOS
  // binary that terminates when Google Sign-In opens.
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
    || 'com.googleusercontent.apps.1075844701028-s8p6dmpb3knik9l36m7adiur39unt00e';
  const plugins = [...(config.plugins || [])];

  if (iosUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme },
    ]);
  }

  // Xcode 26 requires every CocoaPods target to declare iOS 15 or newer.
  // Several third-party podspecs still declare older versions, so normalize
  // their generated build settings during Expo prebuild.
  plugins.push(require('./plugins/withIosPodsDeploymentTarget'));

  return { ...config, plugins };
};
