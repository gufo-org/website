import { getCollection } from 'astro:content';

/** Published (non-draft) blog posts, newest first. */
export const getPosts = async () =>
  (await getCollection('blog', ({ data }) => !data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
