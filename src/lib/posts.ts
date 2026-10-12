import { getCollection, type CollectionEntry } from 'astro:content';

// getCollection logs "The collection does not exist or is empty" on every call while
// src/content/blog has no posts, so skip it until there is a file to load.
const files = import.meta.glob('../content/blog/**/*.{md,mdx}');

/** Published (non-draft) blog posts, unsorted. */
export async function getPosts(): Promise<CollectionEntry<'blog'>[]> {
  if (Object.keys(files).length === 0) return [];
  return getCollection('blog', ({ data }) => !data.draft);
}
