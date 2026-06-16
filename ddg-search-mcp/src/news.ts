import { ddgGet } from './client.js';

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
  snippet: string;
  image?: string;
}

interface DdgNewsItem {
  title?: string;
  url?: string;
  source?: string;
  date?: string;
  excerpt?: string;
  image?: string;
}

/**
 * News search via DuckDuckGo news.js endpoint.
 */
export async function newsSearch(
  query: string,
  maxResults?: number,
): Promise<NewsItem[]> {
  const limit = maxResults ?? 5;

  const results = await ddgGet<DdgNewsItem[]>('duckduckgo.com/news.js', {
    q: query,
    l: 'us-en',
    noamp: '1',
  });

  return results.slice(0, limit).map((item) => {
    const newsItem: NewsItem = {
      title: item.title ?? '',
      url: item.url ?? '',
      source: item.source ?? '',
      date: item.date ?? '',
      snippet: item.excerpt ?? '',
    };
    if (item.image) {
      newsItem.image = item.image;
    }
    return newsItem;
  });
}
