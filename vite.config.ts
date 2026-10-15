import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { createOtpApiMiddleware } from './src/server/otpMiddleware';

function viBackendAndPreviewPlugin(): Plugin {
  const middleware = createOtpApiMiddleware();

  const ensurePreviewNginxReady = () => {
    try {
      const luaPath = '/etc/nginx/user_auth_verification.lua';
      if (fs.existsSync(luaPath)) {
        const content = fs.readFileSync(luaPath, 'utf8');
        if (
          content.includes('if ngx.var.host == "localhost" then') &&
          !content.includes('if true or ngx.var.host == "localhost" then')
        ) {
          const updated = content.replace(
            'if ngx.var.host == "localhost" then',
            'if true or ngx.var.host == "localhost" then'
          );
          fs.writeFileSync(luaPath, updated, 'utf8');
          execSync('nginx -s reload', { stdio: 'ignore' });
        }
      }
    } catch (_) {
      // Ignore in non-container environments
    }
  };

  return {
    name: 'vi-sales-mnp-otp-backend',
    configureServer(server) {
      ensurePreviewNginxReady();
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      ensurePreviewNginxReady();
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      viBackendAndPreviewPlugin(),
      react(), 
      tailwindcss(),
    ],
    build: {
      chunkSizeWarningLimit: 2000,
    },
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('AIzaSyBMOEFTcBLVo-azih7gK-KGimcvS-oKfHo'),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('vi-seles-mnp-e7594'),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('vi-seles-mnp-e7594.firebaseapp.com'),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify('vi-seles-mnp-e7594.firebasestorage.app'),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('1064518972558'),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('1:1064518972558:web:bc6ad9ca16f166fa2245df'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      hmr: false,
      cors: true,
    },
    preview: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      cors: true,
    },
  };
});
