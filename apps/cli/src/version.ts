// Version is injected at build time by esbuild
// Falls back to package.json for development
declare const __CLI_VERSION__: string | undefined;

export const VERSION: string = typeof __CLI_VERSION__ !== 'undefined' ? __CLI_VERSION__ : '0.1.10';
