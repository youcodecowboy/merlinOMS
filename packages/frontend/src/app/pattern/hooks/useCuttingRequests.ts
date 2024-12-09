import useSWR from 'swr';

const fetcher = async (url: string) => {
  console.log('Fetching cutting requests from:', url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch cutting requests');
  }
  const data = await response.json();
  console.log('Raw API response:', JSON.stringify(data, null, 2));
  
  // Ensure we have the requests array and each request has proper metadata
  if (!data.requests) {
    console.error('Invalid response format:', data);
    return { requests: [] };
  }
  
  const formattedRequests = data.requests.map((request: any) => {
    console.log('Processing request:', JSON.stringify(request, null, 2));
    
    // Ensure metadata is properly structured
    const metadata = request.metadata || {};
    console.log('Request metadata:', JSON.stringify(metadata, null, 2));
    
    // Ensure sku_groups is an array
    if (!Array.isArray(metadata.sku_groups)) {
      console.warn('sku_groups is not an array:', metadata.sku_groups);
      metadata.sku_groups = [];
    }
    
    return {
      ...request,
      metadata: metadata
    };
  });
  
  console.log('Final formatted requests:', JSON.stringify(formattedRequests, null, 2));
  return {
    requests: formattedRequests
  };
};

export function useCuttingRequests() {
  const { data, error, mutate } = useSWR('/api/requests?type=CUTTING', fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds
  });

  console.log('useCuttingRequests hook data:', JSON.stringify(data, null, 2));
  console.log('useCuttingRequests hook error:', error);

  return {
    data: data || { requests: [] },
    error,
    mutate,
    isLoading: !error && !data,
  };
} 