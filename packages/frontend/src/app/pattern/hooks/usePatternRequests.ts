import useSWR from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch pattern requests');
  }
  const data = await response.json();
  return { requests: data };
};

export function usePatternRequests() {
  return useSWR('/api/requests?type=PATTERN', fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds
  });
} 