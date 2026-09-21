# Vi Sales MNP - Android Studio & APK Guide

आपका **Vi Sales MNP** प्रोजेक्ट अब Android Studio के लिए पूरी तरह तैयार है।

## 📁 Android प्रोजेक्ट की संरचना (Project Structure)
- **Root Directory**: `android/`
- **Application Module**: `android/app/`
- **Package Name**: `com.vi.salesmnp`
- **Firebase Configuration**: `android/app/google-services.json`
- **Manifest & Permissions**: `android/app/src/main/AndroidManifest.xml`
- **Assets**: `android/app/src/main/assets/public/`

---

## 🚀 Android Studio में कैसे खोलें (How to Open in Android Studio)
1. **Android Studio** खोलें।
2. **Open** पर क्लिक करें और इस प्रोजेक्ट का **`android`** फ़ोल्डर चुनें।
3. Gradle Sync अपने आप शुरू होगा। (Gradle Wrapper v8.14.3 और Android Gradle Plugin 8.13 पहले से कॉन्फ़िगर हैं)।

---

## 📱 APK कैसे बनाएं (How to Build APK)

### 1. Debug APK बनाने के लिए:
- Android Studio मेन्यू में जाएं: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
- प्रोसेस पूरा होने के बाद नीचे दाईं ओर **locate** पर क्लिक करें। आपका `.apk` फ़ाइल `android/app/build/outputs/apk/debug/app-debug.apk` में मिल जाएगा।

### 2. Command Line (Terminal) से APK बनाने के लिए:
```bash
cd android
./gradlew assembleDebug
```
(Windows PowerShell/CMD के लिए: `.\gradlew.bat assembleDebug`)

### 3. Signed Release APK बनाने के लिए:
- Android Studio मेन्यू: **Build** > **Generate Signed Bundle / APK...**
- **APK** चुनें और अपनी Keystore की जानकारी डालकर **Release APK** एक्सपोर्ट करें।

---

## 🔄 Web Assets Sync करने के लिए (Sync Web Updates to Android)
यदि आप React कोड में कोई बदलाव करते हैं:
```bash
npm run build:android
```
या
```bash
npm run cap:sync
```
यह कमांड नए web assets को Android प्रोजेक्ट में तुरंत सिंक कर देता है।
