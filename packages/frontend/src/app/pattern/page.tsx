import { Suspense } from 'react';
import { PatternRequestsTable } from './components/PatternRequestsTable';
import { PageHeader } from '@/components/PageHeader';

export default function PatternPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Pattern Requests"
        description="View and manage pattern requests. Group multiple patterns into cutting requests."
      />
      <Suspense fallback={<div>Loading pattern requests...</div>}>
        <PatternRequestsTable />
      </Suspense>
    </div>
  );
} 