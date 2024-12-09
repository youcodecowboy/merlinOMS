import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutGrid,
  Box,
  Warehouse,
  Settings,
  Users,
  ClipboardList,
  Package
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

const items: NavItem[] = [
  {
    title: "My Requests",
    href: "/",
    icon: <ClipboardList className="h-4 w-4" />
  },
  {
    title: "Production",
    href: "/production",
    icon: <Box className="h-4 w-4" />
  },
  {
    title: "Warehouse",
    href: "/warehouse",
    icon: <Warehouse className="h-4 w-4" />
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: <Package className="h-4 w-4" />
  },
  {
    title: "Users",
    href: "/users",
    icon: <Users className="h-4 w-4" />
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />
  }
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-2 p-4">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2",
              pathname === item.href && "bg-secondary"
            )}
          >
            {item.icon}
            {item.title}
          </Button>
        </Link>
      ))}
    </nav>
  )
} 