App.info({
  id: 'com.sdunster.lantern',
  name: 'Lantern',
  description: 'Mobile beacon companion',
  author: 'Sam Dunster',
  email: 'lantern@sdunster.com',
  website: 'http://sdunster.com',
  version: '0.1.2'
});

App.icons({
  // iOS
  'iphone': 'resources/icon-60.png',
  'iphone_2x': 'resources/icon-120.png',
  'iphone_3x': 'resources/icon-180.png',
  //'ipad': 'resources/icon-72x72.png',
  //'ipad_2x': 'resources/icon-72x72@2x.png',

  // Android
  'android_ldpi': 'resources/icon-36.png',
  'android_mdpi': 'resources/icon-48.png',
  'android_hdpi': 'resources/icon-72.png',
  'android_xhdpi': 'resources/icon-96.png'
});

App.launchScreens({
  // iOS
  'iphone': 'resources/launch-320x480.png',
  'iphone_2x': 'resources/launch-640x960.png',
  'iphone5': 'resources/launch-640x1136.png',
  'iphone6': 'resources/launch-750x1334.png',
  'iphone6p_portrait': 'resources/launch-1242x2208.png',
  'iphone6p_landscape': 'resources/launch-2208x1242.png',
  //'ipad_portrait': 'resources/splash/splash-768x1024.png',
  //'ipad_portrait_2x': 'resources/splash/splash-768x1024@2x.png',
  //'ipad_landscape': 'resources/splash/splash-1024x768.png',
  //'ipad_landscape_2x': 'resources/splash/splash-1024x768@2x.png',

  // Android
  'android_ldpi_portrait': 'resources/launch-200x320.png',
  //'android_ldpi_landscape': 'resources/splash/splash-320x200.png',
  'android_mdpi_portrait': 'resources/launch-320x480.png',
  //'android_mdpi_landscape': 'resources/splash/splash-480x320.png',
  'android_hdpi_portrait': 'resources/launch-480x800.png',
  //'android_hdpi_landscape': 'resources/splash/splash-800x480.png',
  'android_xhdpi_portrait': 'resources/launch-720x1280.png',
  //'android_xhdpi_landscape': 'resources/splash/splash-1280x720.png'
});

App.setPreference('HideKeyboardFormAccessoryBar', true);
App.setPreference('BackgroundColor', '0xffdddddd');
App.setPreference('StatusBarStyle', 'lightcontent');
App.setPreference('StatusBarBackgroundColor', '#000000');
App.setPreference('DisallowOverscroll', false);
App.setPreference('webviewbounce', true);
App.setPreference('StatusBarOverlaysWebView', false); // cordova status bar plugin

