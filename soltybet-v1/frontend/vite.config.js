import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['buffer', 'process', 'util', 'stream', 'crypto'],
            globals: {
                Buffer: true,
                global: true,
                process: true
            }
        }),
    ],
    define: {
        global: 'globalThis',
        'process.env.REACT_APP_API_PASSWORD': JSON.stringify(process.env.REACT_APP_API_PASSWORD),
        'process.env.REACT_APP_RPC_URL': JSON.stringify(process.env.REACT_APP_RPC_URL)
    },
    resolve: {
        alias: {
            stream: 'stream-browserify',
            buffer: 'buffer',
            crypto: 'crypto-browserify',
            util: 'util'
        }
    },
    optimizeDeps: {
        include: ['buffer', 'process']
    },
    build: {
        rollupOptions: {
            external: [],
            output: {
                globals: {
                    buffer: 'Buffer'
                }
            }
        }
    }
});
