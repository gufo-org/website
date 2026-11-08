import { getCollection, type CollectionEntry } from 'astro:content';
import versionsJson from '../content/docs/versions.json';

export interface NavItem { title: string; slug: string }
export interface NavGroup { group: string; items: NavItem[] }
export interface DocsVersion {
  version: string;
  /** Gufo tag or commit the pages were synced from. */
  ref: string;
  release: boolean;
  date: string;
  nav: NavGroup[];
}

/** Synced versions, newest first; the first is what /docs shows. */
export const versions = versionsJson as DocsVersion[];
export const latest = versions[0];

/** Entry id `0.32.0/models/qwen3-asr` splits into its version and page slug ('' for the docs home). */
export function splitId(id: string) {
  const [version, ...rest] = id.split('/');
  const slug = rest.join('/').replace(/(^|\/)index$/, '');
  return { version, slug };
}

export const docsUrl = (version: string, slug: string) => `/docs/${version}${slug ? `/${slug}` : ''}`;

export async function getDocs(): Promise<CollectionEntry<'docs'>[]> {
  return getCollection('docs');
}

export const sourceUrl = (ref: string, source: string) => `https://github.com/gufo-org/gufo/blob/${ref}/${source}`;
