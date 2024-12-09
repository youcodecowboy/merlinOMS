import { useEffect, useState } from "react"
import { useDevUser } from "@/lib/auth"
import { CheckCircle, AlertTriangle, ClipboardList } from "lucide-react"

interface Metrics {
  activeRequests: number
  completedToday: number
  completedThisWeek: number
  lateRequests: number
}

export function RequestMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    activeRequests: 0,
    completedToday: 0,
    completedThisWeek: 0,
    lateRequests: 0
  })
  const { devUser } = useDevUser()

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!devUser?.id) return

      try {
        const response = await fetch(`/api/users/${devUser.id}/metrics`)
        const data = await response.json()
        if (data.success) {
          setMetrics(data.metrics)
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      }
    }

    fetchMetrics()
    // Poll every 30 seconds to keep metrics up to date
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [devUser?.id])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Active Requests */}
      <div className="bg-blue-500/10 border-2 border-blue-500 rounded-lg p-4 hover:translate-y-[-2px] hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="h-5 w-5 text-blue-500" />
          <h3 className="font-bold text-blue-500">Active</h3>
        </div>
        <p className="text-2xl font-bold">{metrics.activeRequests}</p>
        <p className="text-sm text-muted-foreground">Current requests</p>
      </div>

      {/* Completed Today */}
      <div className="bg-green-500/10 border-2 border-green-500 rounded-lg p-4 hover:translate-y-[-2px] hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h3 className="font-bold text-green-500">Today</h3>
        </div>
        <p className="text-2xl font-bold">{metrics.completedToday}</p>
        <p className="text-sm text-muted-foreground">Completed today</p>
      </div>

      {/* Completed This Week */}
      <div className="bg-purple-500/10 border-2 border-purple-500 rounded-lg p-4 hover:translate-y-[-2px] hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-5 w-5 text-purple-500" />
          <h3 className="font-bold text-purple-500">Week</h3>
        </div>
        <p className="text-2xl font-bold">{metrics.completedThisWeek}</p>
        <p className="text-sm text-muted-foreground">Completed this week</p>
      </div>

      {/* Late Requests */}
      <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4 hover:translate-y-[-2px] hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="font-bold text-red-500">Late</h3>
        </div>
        <p className="text-2xl font-bold">{metrics.lateRequests}</p>
        <p className="text-sm text-muted-foreground">Overdue requests</p>
      </div>
    </div>
  )
} 