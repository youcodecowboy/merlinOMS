"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutGrid,
  Box,
  ClipboardList,
  PackageSearch,
  Settings,
  Users,
  Warehouse,
  X,
  ChevronDown,
  ChevronLeft as ChevronRight,
  Timer,
  Scissors,
  CheckCircle,
  Shirt as TShirt,
  PackagePlus
} from 'lucide-react'
import { useState } from 'react'

interface Route {
  label: string
  icon: any
  href: string
  color?: string
  subItems?: {
    label: string
    href: string
  }[]
}

const routes: Route[] = [
  {
    label: 'Dashboard',
    icon: LayoutGrid,
    href: '/',
    color: "text-sky-500"
  },
  {
    label: 'Customers',
    icon: Users,
    href: '/customers',
    color: "text-violet-500",
  },
  {
    label: 'Orders',
    icon: ClipboardList,
    href: '/orders',
    color: "text-emerald-500",
  },
  {
    label: 'Inventory',
    icon: Box,
    color: "text-pink-700",
    href: '/inventory',
  },
  {
    label: 'Production',
    icon: PackageSearch,
    color: "text-orange-700",
    href: '/production',
    subItems: [
      {
        label: 'Pending Production',
        href: '/production'
      },
      {
        label: 'Production Batches',
        href: '/production/batches'
      }
    ]
  },
  {
    label: 'Pattern',
    icon: Scissors,
    color: "text-purple-700",
    href: '/pattern',
  },
  {
    label: 'Warehouse',
    icon: Warehouse,
    href: '/warehouse',
    color: "text-blue-500",
  },
  {
    label: 'Wash',
    icon: Timer,
    href: '/wash',
    color: "text-blue-500",
    subItems: [
      {
        label: 'Requests',
        href: '/wash'
      },
      {
        label: 'Wash Bins',
        href: '/wash/bins'
      }
    ]
  },
  {
    label: 'Finishing',
    icon: TShirt,
    href: '/finishing',
    color: "text-purple-500",
  },
  {
    label: 'Packing',
    icon: PackagePlus,
    href: '/packing',
    color: "text-orange-500",
  },
  {
    label: 'Quality Check',
    icon: CheckCircle,
    href: '/qc',
    color: "text-green-500",
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
  },
]

interface SidebarProps {
  onClose: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['/production'])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="p-6 flex items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-[60px] w-[60px] overflow-hidden">
            <Image
              src="/wizard-hat.png"
              alt="Merlin Logo"
              width={60}
              height={60}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Merlin
          </h1>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary/10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>
      <div className="flex-1 px-4 py-6">
        <nav className="space-y-1">
          {routes.map((route) => {
            const isActive = route.subItems
              ? pathname.startsWith(route.href)
              : pathname === route.href
            const isExpanded = expandedItems.includes(route.href)

            return (
              <div key={route.href}>
                <Link
                  href={route.href}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                  onClick={(e) => {
                    if (route.subItems) {
                      e.preventDefault()
                      toggleExpanded(route.href)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <route.icon className={cn("h-5 w-5", route.color)} />
                    {route.label}
                  </div>
                  {route.subItems && (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  )}
                </Link>
                {route.subItems && isExpanded && (
                  <div className="ml-9 mt-1 space-y-1">
                    {route.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          pathname === subItem.href
                            ? "text-primary"
                            : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
} 