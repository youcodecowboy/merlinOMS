"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface Column<T> {
  key: string;
  label: string;
  render?: ((value: any, row: T) => React.ReactNode) | ((row: T) => React.ReactNode);
  sortable?: boolean;
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: Column<TData>[];
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  renderRowDetails?: (row: TData) => React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<TData>({
  data,
  columns,
  onRowClick,
  rowClassName,
  renderRowDetails,
  isLoading = false
}: DataTableProps<TData>) {
  const handleRowClick = (row: TData) => {
    if (!row) return
    onRowClick?.(row)
  }

  const renderCell = (column: Column<TData>, row: TData) => {
    if (!column.render) {
      return (row as any)?.[column.key] || '-'
    }

    try {
      // Try two-argument version first
      const result = (column.render as (value: any, row: TData) => React.ReactNode)(
        (row as any)?.[column.key],
        row
      )
      return result
    } catch {
      // If that fails, try one-argument version
      try {
        const result = (column.render as (row: TData) => React.ReactNode)(row)
        return result
      } catch {
        // If both fail, return default
        return (row as any)?.[column.key] || '-'
      }
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="h-24 text-center"
              >
                Loading...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!data || data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="h-24 text-center"
              >
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row: TData, index) => (
              <React.Fragment key={index}>
                <TableRow
                  onClick={() => handleRowClick(row)}
                  className={`
                    ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    ${rowClassName?.(row) || ""}
                  `}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {renderCell(column, row)}
                    </TableCell>
                  ))}
                </TableRow>
                {renderRowDetails && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="p-0">
                      {renderRowDetails(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
} 