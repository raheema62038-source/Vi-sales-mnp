/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "index.html",
    "revision": "0b8d7d035bc2520c1caf1373b2b14446"
  }, {
    "url": "assets/web-CrAjVBBD.js",
    "revision": null
  }, {
    "url": "assets/index-DTVn19UW.js",
    "revision": null
  }, {
    "url": "assets/index-BR49I_Li.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "31875f6acfba92fc08dbac00f45c5f7b"
  }, {
    "url": "favicon.ico",
    "revision": "7eeb75f955ec2dc9b27f8313963233f7"
  }, {
    "url": "icon.svg",
    "revision": "36136835de6fe0e3c8f1b063d5a62e9c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d6c9b5abee8b30412e6a423f1e1802b5"
  }, {
    "url": "pwa-512x512.png",
    "revision": "4eeaccfdaad887014c724eee08c2778c"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "4eeaccfdaad887014c724eee08c2778c"
  }, {
    "url": "manifest.webmanifest",
    "revision": "b1ecf12f7056d07aa002d4c448b5b520"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
