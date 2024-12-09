"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutGrid,
  Box,
  ClipboardList,
  PackageSearch,
  Warehouse,
  Timer,
  ChevronDown,
  ChevronLeft as ChevronRight,
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
    label: 'Warehouse',
    icon: Warehouse,
    href: '/warehouse',
    color: "text-violet-500",
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
        label: 'Pending',
        href: '/production'
      },
      {
        label: 'Batches',
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
    label: 'Orders',
    icon: ClipboardList,
    href: '/orders',
    color: "text-emerald-500",
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
    href: '/quality-check',
    color: "text-green-500",
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  return (
    <nav className="py-2">
      <div className="flex items-center justify-around">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = route.subItems
            ? pathname.startsWith(route.href)
            : pathname === route.href
          const isExpanded = expandedItems.includes(route.href)
          
          return (
            <div key={route.href} className="relative">
              <Link
                href={route.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-primary"
                )}
                onClick={(e) => {
                  if (route.subItems) {
                    e.preventDefault()
                    toggleExpanded(route.href)
                  }
                }}
              >
                <Icon className={cn(
                  "h-6 w-6",
                  isActive && route.color
                )} />
                <span className="text-xs font-medium">{route.label}</span>
                {route.subItems && (
                  isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )
                )}
              </Link>
              {route.subItems && isExpanded && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg py-1">
                  {route.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "block px-4 py-2 text-xs font-medium transition-colors",
                        pathname === subItem.href
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
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
      </div>
    </nav>
  )
} 