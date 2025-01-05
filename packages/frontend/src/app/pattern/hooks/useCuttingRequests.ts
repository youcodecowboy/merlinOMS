import useSWR from 'swr';

interface CuttingRequest {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  metadata: {
    pattern_request_ids: string[];
    sku_groups: Array<{
      sku: string;
      quantity: number;
      pattern_requests: string[];
    }>;
    item_ids: string[];
    started_at?: string;
    completion?: {
      fabricCode: string;
      fabricConsumption: number;
      shadeCode: string;
      notes?: string;
      completed_at: string;
    };
  };
  created_at: string;
}

const fetcher = async (url: string) => {
  console.log('Fetching cutting requests from:', url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch cutting requests');
  }
  const data = await response.json();
  console.log('Raw API response:', JSON.stringify(data, null, 2));
  
  // Ensure we have the requests array
  if (!data.requests || !Array.isArray(data.requests)) {
    console.error('Invalid response format:', data);
    return { requests: [] };
  }
  
  const formattedRequests = data.requests.map((request: any) => {
    console.log('Processing request:', JSON.stringify(request, null, 2));
    
    // Ensure all required fields are present with proper defaults
    const formatted: CuttingRequest = {
      id: request.id || 'UNKNOWN',
      status: request.status || 'PENDING',
      created_at: request.created_at || new Date().toISOString(),
      metadata: {
        pattern_request_ids: Array.isArray(request.metadata?.pattern_request_ids) 
          ? request.metadata.pattern_request_ids 
          : [],
        sku_groups: Array.isArray(request.metadata?.sku_groups)
          ? request.metadata.sku_groups.map((group: any) => ({
              sku: group.sku || 'UNKNOWN',
              quantity: Number(group.quantity) || 0,
              pattern_requests: Array.isArray(group.pattern_requests) 
                ? group.pattern_requests 
                : []
            }))
          : [],
        item_ids: Array.isArray(request.metadata?.item_ids)
          ? request.metadata.item_ids
          : [],
        started_at: request.metadata?.started_at,
        completion: request.metadata?.completion ? {
          fabricCode: request.metadata.completion.fabricCode || '',
          fabricConsumption: Number(request.metadata.completion.fabricConsumption) || 0,
          shadeCode: request.metadata.completion.shadeCode || '',
          notes: request.metadata.completion.notes,
          completed_at: request.metadata.completion.completed_at || new Date().toISOString()
        } : undefined
      }
    };
    
    console.log('Formatted request:', JSON.stringify(formatted, null, 2));
    return formatted;
  });
  
  console.log('Final formatted requests:', JSON.stringify(formattedRequests, null, 2));
  return {
    requests: formattedRequests
  };
};

export function useCuttingRequests() {
  const { data, error, mutate } = useSWR<{ requests: CuttingRequest[] }>('/api/requests?type=CUTTING', fetcher, {
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