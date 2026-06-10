import RNUxcam from 'react-native-ux-cam';

export function initUxCam(): void {
  RNUxcam.optIntoSchematicRecordings();
  RNUxcam.startWithConfiguration({
    userAppKey: 'ofgjy4vgtc523yt-us',
    enableAutomaticScreenNameTagging: false,
    enableImprovedScreenCapture: true,
  });
}
