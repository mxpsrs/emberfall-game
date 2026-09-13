# Veldren Android beta 0.1.0

An installable landscape Android WebView client for the live Veldren game.

## Install and play

Open `Veldren-Beta-0.1.0.apk` on Android 8.0 or newer. If Android asks, allow your chosen browser or file manager to install this APK. Sign in with your existing Veldren username and password. Browser login cookies do not automatically transfer into the app.

Internet is required. The game and its assets load from https://emberfall-realms.rayfgarrison97.chatgpt.site/. Website updates appear in the app when it reloads; the APK does not include a separate offline game or change server capacity. This is a beta APK for direct installation, not a Google Play release.

The app requests only INTERNET. It uses a hardware-accelerated WebView, persistent first-party cookies, landscape orientation, immersive display, cutout and keyboard handling, and native retry controls. External web links open in the browser. It grants no JavaScript-to-native bridge and disables local file access, cleartext traffic and mixed content.

## Validation

Built against Android API 35; minimum API 26. Universal managed-code APK (no ABI-specific native libraries). Android APK signature schemes v2 and v3 verified; ZIP integrity, mandatory entries and four-byte uncompressed resource alignment passed. The final package metadata and INTERNET-only permission list were inspected with Android AAPT2. It has not been launched on a physical Android device or emulator; gameplay, keyboard and device-specific WebView performance still need a phone check.

Package ID: `games.emberfall.beta`  
Version code: `1`  
Version name: `0.1.0-beta`  
Signing certificate SHA-256: `afcd4fdf4f81291997ca797043670a1d3be562ff59406dd554aa035fc6bbbc37`

## Build another APK

Linux, JDK 17 or newer, and Python 3 are required. No Gradle or Android Studio installation is needed.

1. Run `python3 fetch_tools.py`. Tool downloads come from Google's Android/AOSP repositories and must match `tools.json` SHA-256 checksums. If an upstream main-branch file changes, the downloader fails rather than silently accepting different bytes.
2. Extract the private signing backup somewhere outside this source folder. Do not put it into a public repository or share it with players.
3. Increase `android:versionCode` in `app/src/main/AndroidManifest.xml` for an app update. Keep the same package ID and signing key to update an existing installation.
4. Run:

```sh
ANDROID_TOOLS_DIR="$PWD/.android-tools" EMBERFALL_SIGNING_DIR="/absolute/path/to/private-signing-backup" python3 build.py
```

The build creates a signed APK and a checksum file. Update the artifact filename in `build.py` when changing the app version. Never place an account password or server operator token into the APK.

## References

- Android WebView: https://developer.android.com/develop/ui/views/layout/webapps/webview
- Android APK signing: https://developer.android.com/tools/apksigner
- Official build tools: source URLs and exact hashes in `tools.json`
