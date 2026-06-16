import { describe, it, expect, beforeEach, vi } from 'vitest';
import { newsSearch } from './news.js';
import type { NewsItem } from './news.js';

// Mock ddgGet from client
const mockDdgGet = vi.hoisted(() => vi.fn());
vi.mock('./client.js', () => ({
  ddgGet: mockDdgGet,
}));

// Sample DDG news.js response items
const sampleNewsItems = [
  {
    title: 'AI Breakthrough in Quantum Computing',
    url: 'https://example.com/ai-quantum',
    source: 'Tech News',
    date: '2024-06-15T10:00:00Z',
    excerpt: 'Researchers achieve major milestone in quantum machine learning.',
    image: 'https://example.com/quantum.jpg',
  },
  {
    title: 'New Programming Language Released',
    url: 'https://example.com/new-lang',
    source: 'Dev Weekly',
    date: '2024-06-14T08:30:00Z',
    excerpt: 'A new systems programming language promises faster compilation.',
  },
];

describe('newsSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls ddgGet with the news.js endpoint and correct query params', async () => {
    mockDdgGet.mockResolvedValue([]);

    await newsSearch('technology');

    expect(mockDdgGet).toHaveBeenCalledWith(
      'duckduckgo.com/news.js',
      {
        q: 'technology',
        l: 'us-en',
        noamp: '1',
      },
    );
  });

  it('returns mapped NewsItem array from response', async () => {
    mockDdgGet.mockResolvedValue(sampleNewsItems);

    const results = await newsSearch('technology');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'AI Breakthrough in Quantum Computing',
      url: 'https://example.com/ai-quantum',
      source: 'Tech News',
      date: '2024-06-15T10:00:00Z',
      snippet: 'Researchers achieve major milestone in quantum machine learning.',
      image: 'https://example.com/quantum.jpg',
    });
    expect(results[1]).toEqual({
      title: 'New Programming Language Released',
      url: 'https://example.com/new-lang',
      source: 'Dev Weekly',
      date: '2024-06-14T08:30:00Z',
      snippet: 'A new systems programming language promises faster compilation.',
    });
    // Item without image should not have image property
    expect(results[1].image).toBeUndefined();
  });

  it('limits results to default maxResults of 5', async () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      title: `Article ${i + 1}`,
      url: `https://example.com/article${i + 1}`,
      source: 'News',
      date: '2024-06-15T10:00:00Z',
      excerpt: `Snippet ${i + 1}`,
    }));
    mockDdgGet.mockResolvedValue(manyItems);

    const results = await newsSearch('technology');

    expect(results).toHaveLength(5);
  });

  it('respects custom maxResults parameter', async () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      title: `Article ${i + 1}`,
      url: `https://example.com/article${i + 1}`,
      source: 'News',
      date: '2024-06-15T10:00:00Z',
      excerpt: `Snippet ${i + 1}`,
    }));
    mockDdgGet.mockResolvedValue(manyItems);

    const results = await newsSearch('technology', { maxResults: 3 });

    expect(results).toHaveLength(3);
  });

  it('returns empty array for empty API response', async () => {
    mockDdgGet.mockResolvedValue([]);

    const results = await newsSearch('technology');

    expect(results).toEqual([]);
  });

  it('handles items with empty string fields gracefully', async () => {
    const partialItem = {
      title: '',
      url: '',
      source: '',
      date: '',
      excerpt: '',
    };
    mockDdgGet.mockResolvedValue([partialItem]);

    const results = await newsSearch('tech');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: '',
      url: '',
      source: '',
      date: '',
      snippet: '',
    });
  });

  it('exports NewsItem interface with correct shape', () => {
    // Type-level test — just verify the interface is importable
    const item: NewsItem = {
      title: 'Test',
      url: 'https://test.com',
      source: 'Test',
      date: '2024-01-01',
      snippet: 'Test snippet',
    };
    expect(item.title).toBe('Test');
    expect(item.url).toBe('https://test.com');
    expect(item.source).toBe('Test');
    expect(item.date).toBe('2024-01-01');
    expect(item.snippet).toBe('Test snippet');
    expect(item.image).toBeUndefined();
  });

  it('preserves image property when present', () => {
    const item: NewsItem = {
      title: 'Test',
      url: 'https://test.com',
      source: 'Test',
      date: '2024-01-01',
      snippet: 'Test snippet',
      image: 'https://test.com/image.jpg',
    };
    expect(item.image).toBe('https://test.com/image.jpg');
  });
});
