import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

export async function downloadAndOpenPdf(url: string, fileName: string) {
  if (Platform.OS === 'android') {
    const response = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: fileName,
        description: 'Downloading order slip',
        mime: 'application/pdf',
        mediaScannable: true,
        path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
      },
    }).fetch('GET', url);

    const path = response.path();
    await ReactNativeBlobUtil.android.actionViewIntent(
      path,
      'application/pdf',
    );
    return path;
  }

  const path = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;
  const response = await ReactNativeBlobUtil.config({
    fileCache: true,
    path,
  }).fetch('GET', url);

  await ReactNativeBlobUtil.ios.openDocument(response.path());
  return response.path();
}
