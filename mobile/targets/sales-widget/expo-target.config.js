module.exports = (config) => ({
  type: 'widget',
  name: 'SalesWidget',
  displayName: 'Vendas de hoje',
  bundleIdentifier: '.saleswidget',
  deploymentTarget: '15.1',
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
