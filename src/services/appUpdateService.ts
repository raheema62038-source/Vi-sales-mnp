import { AppUpdateConfig } from '../types';
import { getCurrentAppVersion, isNewerVersionAvailable, AppVersionInfo } from '../config/appVersion';

export const DEFAULT_APP_UPDATE_CONFIG: AppUpdateConfig = {
  latestVersionName: '1.1',
  latestVersionCode: 2,
  apkDownloadUrl: 'https://github.com/raheema62038/vi-sales-mnp/releases/latest/download/app-debug.apk',
  updateMessage: 'आपके लिए ऐप का नया version उपलब्ध है।',
  releaseNotes: '• नया ऑटोमैटिक अपडेट सिस्टम\n• बेहतर परफॉरमेंस और स्टेबिलिटी\n• डोरस्टेप एमएक्सपी बुकिंग सुधार',
  forceUpdate: false,
  enabled: true,
  releasedAt: new Date().toISOString()
};

const SESSION_DISMISS_PREFIX = 'vi_app_update_dismissed_';

/**
 * Check if the user has already tapped "Later" for this specific version in the current session.
 */
export function hasDismissedUpdateForSession(versionCode: number): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    return window.sessionStorage.getItem(`${SESSION_DISMISS_PREFIX}${versionCode}`) === 'true';
  } catch (err) {
    console.warn('Could not read sessionStorage for update dismissal:', err);
    return false;
  }
}

/**
 * Record that the customer chose "Later" during this app session.
 * This prevents repeatedly showing the popup during the same session (Requirement 8).
 */
export function dismissUpdateForSession(versionCode: number): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`${SESSION_DISMISS_PREFIX}${versionCode}`, 'true');
    }
  } catch (err) {
    console.warn('Could not save update dismissal to sessionStorage:', err);
  }
}

/**
 * Clear dismissed updates (e.g. for testing)
 */
export function clearUpdateDismissal(versionCode?: number): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (versionCode) {
        window.sessionStorage.removeItem(`${SESSION_DISMISS_PREFIX}${versionCode}`);
      } else {
        Object.keys(window.sessionStorage).forEach((key) => {
          if (key.startsWith(SESSION_DISMISS_PREFIX)) {
            window.sessionStorage.removeItem(key);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Could not clear sessionStorage dismissal:', err);
  }
}

export interface AppUpdateCheckResult {
  updateAvailable: boolean;
  shouldShowPopup: boolean;
  installedVersion: AppVersionInfo;
  latestConfig: AppUpdateConfig;
  isForceUpdate: boolean;
}

/**
 * Perform a full check of installed version vs configured latest version.
 * Handles safe error catching, session dismissal check, and force update rules.
 */
export async function performAppUpdateCheck(
  configuredUpdate?: AppUpdateConfig,
  currentInstalled?: AppVersionInfo
): Promise<AppUpdateCheckResult> {
  const installed = currentInstalled || await getCurrentAppVersion();
  const latest = configuredUpdate || DEFAULT_APP_UPDATE_CONFIG;

  const updateAvailable = isNewerVersionAvailable(installed, latest);
  
  // If forceUpdate is ON, we ignore the session dismissal (Requirement 15)
  // If forceUpdate is OFF, check if customer already selected "Later" this session (Requirement 8)
  const isDismissed = !latest.forceUpdate && hasDismissedUpdateForSession(latest.latestVersionCode);
  const shouldShowPopup = updateAvailable && !isDismissed;

  return {
    updateAvailable,
    shouldShowPopup,
    installedVersion: installed,
    latestConfig: latest,
    isForceUpdate: Boolean(latest.forceUpdate)
  };
}

/**
 * Safely open the APK download URL.
 * Does NOT install automatically without permission (Requirement 6).
 * Triggers the browser/system download manager so the user can download and confirm installation.
 */
export function openApkDownloadUrl(url: string): void {
  if (!url) {
    console.warn('No APK download URL provided.');
    return;
  }

  try {
    const targetUrl = url.trim();
    // Use window.open or location.href
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = targetUrl;
    }
  } catch (err) {
    console.error('Failed to open APK download URL:', err);
    window.location.href = url;
  }
}
