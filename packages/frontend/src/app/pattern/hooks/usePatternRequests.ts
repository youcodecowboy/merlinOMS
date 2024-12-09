import useSWR from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch pattern requests');
  }
  const data = await response.json();

  // Fetch order information for each request that has order_ids
  const requestsWithOrders = await Promise.all(
    data.requests.map(async (request: any) => {
      const orderIds = request.metadata?.order_ids;
      if (!orderIds?.length) return request;

      try {
        const orderResponse = await fetch(`/api/orders/${orderIds[0]}`);
        if (!orderResponse.ok) return request;

        const orderData = await orderResponse.json();
        return {
          ...request,
          order: orderData.order
        };
      } catch (error) {
        console.error('Error fetching order:', error);
        return request;
      }
    })
  );

  return {
    ...data,
    requests: requestsWithOrders
  };
};

export function usePatternRequests() {
  return useSWR('/api/requests?type=PATTERN', fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds
  });
} 