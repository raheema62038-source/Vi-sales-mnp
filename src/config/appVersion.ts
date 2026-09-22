import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface AppVersionInfo {
  versionName: string;
  versionCode: number;
  appId: string;
  isNative: boolean;
}

/**
 * Base installed app version.
 * This represents the baseline version of the currently distributed APK.
 * On native Android devices, App.getInfo() dynamically reads the actual
 * installed versionCode and versionName from AndroidManifest / build.gradle.
 */
export const INSTALLED_APP_VERSION: AppVersionInfo = {
  versionName: '1.2',
  versionCode: 3,
  appId: 'com.vi.salesmnp',
  isNative: false
};

/**
 * Compare two semver/version strings (e.g. "1.1" vs "1.0", "1.0.1" vs "1.0")
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersionNames(v1: string, v2: string): number {
  const cleanV1 = String(v1 || '').replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const cleanV2 = String(v2 || '').replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  
  const maxLen = Math.max(cleanV1.length, cleanV2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = cleanV1[i] || 0;
    const p2 = cleanV2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Get currently installed app version, either from native Capacitor App plugin
 * or using default configured constants.
 */
export async function getCurrentAppVersion(): Promise<AppVersionInfo> {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      const info = await App.getInfo();
      const code = parseInt(info.build || '2', 10) || 2;
      return {
        versionName: info.version || '1.1',
        versionCode: code,
        appId: info.id || 'com.vi.salesmnp',
        isNative: true
      };
    } catch (err) {
      console.warn('Native App.getInfo() check notice:', err);
    }
  }

  return {
    ...INSTALLED_APP_VERSION,
    isNative
  };
}

/**
 * Helper to check whether a newer version is available.
 * Prioritizes versionCode (standard Android convention: newer APK has higher versionCode).
 * Falls back to versionName comparison if codes are equal or not provided.
 */
export function isNewerVersionAvailable(
  installed: { versionCode: number | string; versionName: string },
  latest: { latestVersionCode: number | string; latestVersionName: string; enabled?: boolean }
): boolean {
  if (latest.enabled === false) {
    return false;
  }

  const latestCode = Number(latest.latestVersionCode);
  const installedCode = Number(installed.versionCode);

  // 1. Primary check: Android VersionCode (standard integer build number)
  if (!isNaN(latestCode) && !isNaN(installedCode) && latestCode > 0 && installedCode > 0) {
    if (latestCode > installedCode) {
      return true;
    }
    if (latestCode < installedCode) {
      return false;
    }
  }

  // 2. Secondary check: VersionName string comparison (e.g., "1.2" > "1.1")
  if (latest.latestVersionName && installed.versionName) {
    return compareVersionNames(String(latest.latestVersionName), String(installed.versionName)) > 0;
  }

  return false;
}
