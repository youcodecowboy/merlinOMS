import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, Circle, AlertTriangle } from "lucide-react"

interface StepCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  stepNumber: number
  isActive?: boolean
  children?: React.ReactNode
}

export function StepCard({
  title,
  description,
  status,
  stepNumber,
  isActive,
  children,
  className,
  ...props
}: StepCardProps) {
  const StatusIcon = {
    pending: Circle,
    in_progress: Circle,
    completed: CheckCircle,
    error: AlertTriangle
  }[status]

  const statusStyles = {
    pending: "text-muted-foreground border-muted-foreground/30",
    in_progress: "text-primary border-primary",
    completed: "text-green-500 border-green-500",
    error: "text-red-500 border-red-500"
  }[status]

  return (
    <div
      className={cn(
        "rounded-lg border bg-background",
        isActive && status === 'in_progress' && "border-l-4 border-l-primary ring-1 ring-primary/10",
        className
      )}
      {...props}
    >
      <div className="flex items-start p-4 sm:p-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 flex-none",
            statusStyles,
            status === 'in_progress' && "bg-primary/5"
          )}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={cn(
                "text-sm font-medium",
                status === 'in_progress' ? "text-primary" : "text-muted-foreground"
              )}>
                {stepNumber}
              </span>
              <h3 className="font-semibold truncate">{title}</h3>
              {status === 'in_progress' && (
                <span className="text-sm text-primary font-medium">In Progress</span>
              )}
              {status === 'pending' && (
                <span className="text-sm text-muted-foreground">Pending</span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            )}
          </div>
        </div>
      </div>

      {isActive && children && (
        <div className="border-t bg-primary/5 p-4 sm:p-6">
          {children}
        </div>
      )}
    </div>
  )
} 