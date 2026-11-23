export function initUxCam(): void {
  // UXCam is optional for app startup. Some older store builds may not have
  // its native module linked, so load it lazily and keep failures isolated.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-ux-cam');
    const uxcam = mod?.default ?? mod;
    uxcam.optIntoSchematicRecordings();
    uxcam.startWithConfiguration({
      userAppKey: 'ofgjy4vgtc523yt-us',
      enableAutomaticScreenNameTagging: false,
    });
  } catch (error) {
    console.warn('[UXCam] initialization unavailable:', error);
  }
}
