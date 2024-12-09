import useSWR from 'swr';

const fetcher = async (url: string) => {
  console.log('Fetching sewing requests from:', url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch sewing requests');
  }
  const data = await response.json();
  console.log('Raw response data:', data);
  
  // Ensure we have the requests array and each request has proper metadata
  if (!data.requests) {
    console.error('Invalid response format:', data);
    return { requests: [] };
  }
  
  const formattedRequests = data.requests.map((request: any) => {
    console.log('Processing request:', request);
    return {
      ...request,
      metadata: request.metadata || {},
    };
  });
  
  console.log('Formatted requests:', formattedRequests);
  return {
    requests: formattedRequests
  };
};

export function useSewingRequests() {
  const { data, error, mutate } = useSWR('/api/requests?type=SEW', fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds
  });

  return {
    data: data || { requests: [] },
    error,
    mutate,
    isLoading: !error && !data,
  };
} 