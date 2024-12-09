import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { UserSwitcher } from "./user-switcher"
import { Settings } from "lucide-react"
import { toast } from "sonner"
import { useDevUser } from "@/lib/auth"

export function DevDashboard() {
  const [isOpen, setIsOpen] = useState(false)
  const { devUser } = useDevUser()

  const createTestRequest = async (type: string) => {
    if (!devUser?.id) {
      toast.error("Please select a user first")
      return
    }

    try {
      // First create a test stock item to use in the request
      const stockResponse = await fetch("http://localhost:3002/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: "ST-32-X-36-BRW",
          quantity: 1,
        }),
      })

      const stockData = await stockResponse.json()
      if (!stockData.success) {
        toast.error("Failed to create test stock item")
        return
      }

      // Create the request
      const response = await fetch("http://localhost:3002/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          items: [{ sku: "ST-32-X-36-BRW", quantity: 1 }],
          notes: `Test ${type.toLowerCase()} request`,
          userId: devUser.id,
        }),
      })

      if (response.ok) {
        toast.success(`Created test ${type.toLowerCase()} request`)
      } else {
        toast.error(`Failed to create ${type.toLowerCase()} request`)
      }
    } catch (error) {
      console.error("Error creating test request:", error)
      toast.error("Error creating test request")
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed bottom-4 right-4 z-50 rounded-full"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Dev Dashboard</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">User Switching</h3>
              <UserSwitcher />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Test Requests</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => createTestRequest("WASH")}
                  className="w-full"
                >
                  Create Wash
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createTestRequest("MOVE")}
                  className="w-full"
                >
                  Create Move
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createTestRequest("QC")}
                  className="w-full"
                >
                  Create QC
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createTestRequest("PATTERN")}
                  className="w-full"
                >
                  Create Pattern
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createTestRequest("CUTTING")}
                  className="w-full"
                >
                  Create Cutting
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createTestRequest("PRODUCTION")}
                  className="w-full"
                >
                  Create Production
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 