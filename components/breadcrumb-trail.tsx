"use client"

import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BreadcrumbItem {
  id: string
  text: string
}

interface BreadcrumbTrailProps {
  breadcrumbs: BreadcrumbItem[]
  onNavigate: (actionId: string | null) => void
}

export function BreadcrumbTrail({ breadcrumbs, onNavigate }: BreadcrumbTrailProps) {
  if (breadcrumbs.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap p-3 bg-muted/20 border-b border-border text-sm">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
        onClick={() => onNavigate(null)}
      >
        <Home className="w-3 h-3 mr-1" />
        root
      </Button>

      {breadcrumbs.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="w-3 h-3 text-muted-foreground mx-1 flex-shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => onNavigate(item.id)}
            title={item.text}
          >
            {item.text}
          </Button>
        </div>
      ))}
    </div>
  )
}
