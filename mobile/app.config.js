// A configuração Google para iOS precisa do URL scheme criado no Google Cloud.
// Mantê-lo no ambiente permite que o projeto continue configurável antes de a
// credencial de produção ser criada, sem colocar um identificador falso no build.
module.exports = ({ config }) => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins || [])];

  if (iosUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme },
    ]);
  }

  return { ...config, plugins };
};
