import type { Plugin } from 'vite'
export function resolveSiteUrl(fallbackUrl: string): string
export default function seoPlugin(options?: { contentPath?: string; fallbackUrl?: string; lastmod?: string }): Plugin
