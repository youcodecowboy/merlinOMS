import { Button } from "@/components/ui/button"
import { Package, QrCode, ArrowRight, Clock } from "lucide-react"

export default function WarehousePage() {
  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-0 md:gap-8">
      <Button 
        className="fixed right-4 bottom-20 md:bottom-8 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <QrCode className="h-6 w-6" />
      </Button>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold md:text-3xl">Warehouse</h1>
        <p className="text-sm text-muted-foreground">12 active requests</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {["Move Items", "Wash Items", "Check Stock", "View Map"].map((action) => (
          <Button
            key={action}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 rounded-lg border-2"
          >
            <Package className="h-8 w-8" />
            <span className="text-sm font-medium">{action}</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Active Requests</h2>
        {[1, 2, 3].map((request) => (
          <button
            key={request}
            className="flex items-center justify-between p-4 rounded-lg border-2 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-mono font-bold">REQ-{request.toString().padStart(4, '0')}</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>5m ago</span>
                </div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Button variant="ghost" className="text-sm">View All</Button>
        </div>
        <div className="flex flex-col divide-y divide-border border-2 rounded-lg">
          {[1, 2, 3].map((activity) => (
            <div key={activity} className="p-4 flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Item moved to Bin A-123</span>
                <span className="text-sm text-muted-foreground">2 minutes ago</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 