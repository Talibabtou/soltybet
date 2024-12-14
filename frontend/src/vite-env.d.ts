/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REACT_APP_RPC_URL: string
  readonly VITE_REACT_APP_RPC_URL_WSS: string
  // Ajoutez ici d'autres variables d'environnement si nécessaire
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.png' {
    const value: string;
    export default value;
  }
  
  declare module '*.jpg' {
    const value: string;
    export default value;
  }
  
  declare module '*.svg' {
    const value: string;
    export default value;
  }