import { AppUpdateConfig } from '../types';
import { getCurrentAppVersion, isNewerVersionAvailable, AppVersionInfo } from '../config/appVersion';

/**
 * Official GitHub repository configuration for Vi Sales MNP
 */
export const GITHUB_REPO_OWNER = 'raheema62038-source';
export const GITHUB_REPO_NAME = 'Vi-sales-mnp';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;

/**
 * Default fallback update configuration
 */
export const DEFAULT_APP_UPDATE_CONFIG: AppUpdateConfig = {
  latestVersionName: '1.2',
  latestVersionCode: 3,
  apkDownloadUrl: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/app-release.apk`,
  updateMessage: 'आपके लिए ऐप का नया version 1.2 उपलब्ध है।',
  releaseNotes: '• नया ऑटोमैटिक अपडेट सिस्टम\n• बेहतर परफॉरमेंस और स्टेबिलिटी\n• डोरस्टेप एमएक्सपी बुकिंग सुधार',
  forceUpdate: false,
  enabled: true,
  releasedAt: new Date().toISOString()
};

const SESSION_DISMISS_PREFIX = 'vi_app_update_dismissed_';

/**
 * Allowed hostnames and URL prefixes for secure APK downloads.
 * Requirement 6: Validate that the update URL belongs to the official GitHub release source.
 */
export function isValidOfficialReleaseUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return false;

    // Must be github.com or github release assets
    const validHosts = [
      'github.com',
      'objects.githubusercontent.com',
      'raw.githubusercontent.com'
    ];
    if (!validHosts.includes(parsed.hostname.toLowerCase())) {
      return false;
    }

    // Must be for the official repository or release download
    const pathname = parsed.pathname.toLowerCase();
    const isOfficialRepo =
      pathname.includes(`/${GITHUB_REPO_OWNER.toLowerCase()}/${GITHUB_REPO_NAME.toLowerCase()}`) ||
      parsed.hostname.toLowerCase() === 'objects.githubusercontent.com';

    return isOfficialRepo;
  } catch {
    return false;
  }
}

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
  error?: string | null;
}

/**
 * Parse version metadata from release notes, tags, or JSON asset
 */
export function parseReleaseMetadata(tag: string, body: string, assets: any[]): {
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  releaseNotes: string;
} {
  // 1. Version name from tag (strip 'v' prefix)
  let versionName = tag ? tag.replace(/^v/i, '').trim() : '1.1';
  let versionCode = 2;

  // 2. Look for explicit Version Code in release body
  if (body) {
    const codeMatch = body.match(/(?:version\s*code|versionCode)[:\s*`]+(\d+)/i);
    if (codeMatch && codeMatch[1]) {
      const parsedCode = parseInt(codeMatch[1], 10);
      if (!isNaN(parsedCode) && parsedCode > 0) {
        versionCode = parsedCode;
      }
    }

    const nameMatch = body.match(/(?:version\s*name|versionName)[:\s*`]+([0-9.]+)/i);
    if (nameMatch && nameMatch[1]) {
      versionName = nameMatch[1].trim();
    }
  }

  // If versionCode was not found in body, derive from major.minor if possible
  if (versionCode === 2 && versionName !== '1.1') {
    const parts = versionName.split('.').map(p => parseInt(p, 10) || 0);
    if (parts.length >= 2) {
      versionCode = parts[0] * 10 + parts[1];
    }
  }

  // 3. Find APK asset download URL
  let downloadUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/app-release.apk`;
  if (Array.isArray(assets) && assets.length > 0) {
    const releaseApk = assets.find((a: any) => a.name === 'app-release.apk');
    const debugApk = assets.find((a: any) => a.name === 'app-debug.apk');
    const anyApk = assets.find((a: any) => String(a.name).endsWith('.apk'));
    const matched = releaseApk || debugApk || anyApk;
    if (matched && matched.browser_download_url) {
      downloadUrl = matched.browser_download_url;
    }
  }

  return {
    versionName,
    versionCode,
    downloadUrl,
    releaseNotes: body || '• सामान्य सुधार एवं नवीन संस्करण'
  };
}

/**
 * Fetch static version.json metadata asset from GitHub repository or public build
 */
export async function fetchVersionJsonMetadata(timeoutMs = 4000): Promise<AppUpdateConfig | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const url = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/public/version.json`;
  try {
    const res = await fetch(url, { signal: controller ? controller.signal : undefined });
    if (timeoutId) clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.versionCode) return null;

    return {
      latestVersionName: String(data.versionName || '1.1'),
      latestVersionCode: Number(data.versionCode || 2),
      apkDownloadUrl: data.downloadUrl || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/app-release.apk`,
      releaseNotes: data.releaseNotes || '• सामान्य सुधार एवं नवीन संस्करण',
      updateMessage: `आपके लिए ऐप का नया version ${data.versionName || '1.1'} उपलब्ध है।`,
      forceUpdate: Boolean(data.mandatory),
      enabled: true,
      releasedAt: new Date().toISOString()
    };
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Check latest release directly from GitHub Releases API asynchronously.
 * Runs non-blocking and handles network errors safely (Requirement 7 & 8).
 */
export async function fetchLatestFromGitHub(timeoutMs = 5000): Promise<AppUpdateConfig | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json'
        },
        signal: controller ? controller.signal : undefined
      }
    );

    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      // If GitHub releases API hits rate limit or release doesn't exist yet, try version.json
      return await fetchVersionJsonMetadata();
    }

    const data = await res.json();
    if (!data || !data.tag_name) return await fetchVersionJsonMetadata();

    const parsed = parseReleaseMetadata(data.tag_name, data.body || '', data.assets || []);

    return {
      latestVersionName: parsed.versionName,
      latestVersionCode: parsed.versionCode,
      apkDownloadUrl: parsed.downloadUrl,
      releaseNotes: parsed.releaseNotes,
      updateMessage: `आपके लिए ऐप का नया version ${parsed.versionName} उपलब्ध है।`,
      forceUpdate: false,
      enabled: true,
      releasedAt: data.published_at || new Date().toISOString()
    };
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    // Non-fatal fallback to version.json
    return await fetchVersionJsonMetadata();
  }
}

/**
 * Perform a full update check comparing installed version with latest available.
 * Combines GitHub Releases live check + version.json metadata + Admin portal settings fallback.
 * Requirement 8: Asynchronous, never blocks startup or main thread.
 */
export async function performAppUpdateCheck(
  configuredUpdate?: AppUpdateConfig,
  currentInstalled?: AppVersionInfo
): Promise<AppUpdateCheckResult> {
  const installed = currentInstalled || (await getCurrentAppVersion());

  // 1. First attempt to query GitHub Releases / version metadata asynchronously
  let latest = configuredUpdate || DEFAULT_APP_UPDATE_CONFIG;
  try {
    const githubLatest = await fetchLatestFromGitHub();
    if (githubLatest) {
      latest = {
        ...latest,
        ...githubLatest,
        forceUpdate: configuredUpdate?.forceUpdate ?? githubLatest.forceUpdate ?? false,
        enabled: configuredUpdate?.enabled ?? true
      };
    }
  } catch (err) {
    console.warn('GitHub update check fallback notice:', err);
  }

  const updateAvailable = isNewerVersionAvailable(installed, latest);
  const isDismissed = !latest.forceUpdate && hasDismissedUpdateForSession(latest.latestVersionCode);
  const shouldShowPopup = updateAvailable && !isDismissed;

  return {
    updateAvailable,
    shouldShowPopup,
    installedVersion: installed,
    latestConfig: latest,
    isForceUpdate: Boolean(latest.forceUpdate),
    error: null
  };
}

/**
 * Safely open the APK download URL.
 * Requirement 5: Open official GitHub Release APK download URL using Android's browser/download mechanism.
 * Requirement 6: Validate that update URL belongs to the official GitHub repository.
 * Do NOT silently install. Let Android's official package installer handle installation and confirmation.
 */
export function openApkDownloadUrl(url: string): { success: boolean; error?: string } {
  if (!url) {
    console.warn('No APK download URL provided.');
    return { success: false, error: 'URL not provided' };
  }

  const targetUrl = url.trim();

  // Validate security requirement 6
  if (!isValidOfficialReleaseUrl(targetUrl)) {
    console.error('Blocked untrusted APK download URL:', targetUrl);
    // Fallback safely to official GitHub latest release URL
    const safeFallbackUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/app-release.apk`;
    window.open(safeFallbackUrl, '_blank', 'noopener,noreferrer');
    return { success: true };
  }

  try {
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = targetUrl;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to open APK download URL:', err);
    window.location.href = targetUrl;
    return { success: true };
  }
}
