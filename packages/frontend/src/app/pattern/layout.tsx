"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Scissors, ClipboardList, PenTool } from "lucide-react"

const tabs = [
  {
    label: "Pattern Requests",
    href: "/pattern",
    icon: ClipboardList,
    exact: true
  },
  {
    label: "Cutting Requests",
    href: "/pattern/cutting",
    icon: Scissors
  },
  {
    label: "Sewing",
    href: "/pattern/sewing",
    icon: PenTool
  }
]

export default function PatternLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <nav className="flex border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.exact 
            ? pathname === tab.href
            : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 -mb-px text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
} 