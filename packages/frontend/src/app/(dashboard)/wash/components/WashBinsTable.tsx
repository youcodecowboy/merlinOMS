import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface InventoryItem {
  id: string
  sku: string
  status1: string
  status2: string
  location: string
  metadata?: Record<string, any>
}

interface BinContents {
  name: string;
  items: InventoryItem[];
  capacity: number;
}

interface WashBinsTableProps {
  bin: BinContents
}

export function WashBinsTable({ bin }: WashBinsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{bin.name}</h2>
          <p className="text-sm text-muted-foreground">
            {bin.items.length} items • {bin.capacity - bin.items.length} spaces available
          </p>
        </div>
        <Badge variant={bin.items.length >= bin.capacity ? "destructive" : "outline"}>
          {Math.round((bin.items.length / bin.capacity) * 100)}% Full
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bin.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No items in bin
              </TableCell>
            </TableRow>
          ) : (
            bin.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.sku}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {item.status1} • {item.status2}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.metadata?.added_at ? new Date(item.metadata.added_at).toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {/* Add actions here */}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
} 