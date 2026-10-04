# Vi Sales MNP - Android Studio & Automatic APK Guide

आपका **Vi Sales MNP** प्रोजेक्ट Android Studio और GitHub Actions ऑटोमैटिक क्लाउड बिल्ड के लिए पूरी तरह तैयार है।

---

## ⚡ 1. ऑटोमैटिक APK कैसे बनाएं (GitHub Actions 1-Click Cloud Build)
यह सबसे तेज़ और आसान तरीका है। आपको अपने कंप्यूटर में Android Studio या Java इंस्टॉल करने की भी ज़रूरत नहीं है; GitHub खुद ऑनलाइन APK कंपाइल करके रिलीज़ कर देता है:

1. **GitHub Repository पर जाएं**:
   [Vi-sales-mnp Workflows](https://github.com/raheema62038-source/Vi-sales-mnp/actions/workflows/build-apk.yml)
2. ऊपर **"Actions"** टैब खोलें।
3. बाईं ओर **"Build Android APK (Vi Sales MNP)"** चुनें।
4. दाईं ओर नीले बटन **"Run workflow"** पर क्लिक करें।
5. वर्ज़न (उदा. `1.3`) और वर्ज़न कोड (उदा. `4`) लिखकर **"Run workflow"** दबाएं।
6. 2 से 3 मिनट में:
   - GitHub Actions साइन्ड रिलीज़ APK (`app-release.apk`) और `app-debug.apk` तैयार कर देगा।
   - यह ऑटोमैटिक रूप से [GitHub Releases](https://github.com/raheema62038-source/Vi-sales-mnp/releases/latest) पर लाइव अपलोड हो जाएगा।
   - पुराने ग्राहकों के ऐप में अपने आप **"🔴 नया अपडेट उपलब्ध है"** का पॉपअप दिखाई देगा!

---

## 📁 Android प्रोजेक्ट की संरचना (Project Structure)
- **Root Directory**: `android/`
- **Application Module**: `android/app/`
- **Package Name**: `com.vi.salesmnp`
- **Current Version**: `v1.3` (VersionCode: `4`)
- **Workflow Path**: `.github/workflows/build-apk.yml`
- **Assets**: `android/app/src/main/assets/public/`

---

## 💻 2. कंप्यूटर / Android Studio में कैसे बनाएं (Manual Studio Build)

### Android Studio में खोलना:
1. **Android Studio** खोलें।
2. **Open** पर क्लिक करें और इस प्रोजेक्ट का **`android`** फ़ोल्डर चुनें।
3. Gradle Sync अपने आप पूरा होगा।

### Debug APK:
- Android Studio मेन्यू: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
- APK फ़ाइल स्थान: `android/app/build/outputs/apk/debug/app-debug.apk`

### Signed Release APK:
- Android Studio मेन्यू: **Build** > **Generate Signed Bundle / APK...**
- **APK** चुनें और Keystore से साइन करके एक्सपोर्ट करें।

---

## 🔄 Web Assets Sync करने के लिए (Sync Web Updates to Android)
यदि आप React/Tailwind कोड में कोई बदलाव करते हैं:
```bash
npm run build:android
```
यह कमांड web assets को Android प्रोजेक्ट में तुरंत सिंक कर देता है।
