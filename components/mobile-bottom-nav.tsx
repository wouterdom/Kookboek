"use client"

import { useRouter, usePathname } from "next/navigation"
import { BookOpen, ShoppingCart, Calendar } from "lucide-react"
import { useGroceryCount } from "./grocery-count-provider"

export function MobileBottomNav() {
  const { uncheckedCount } = useGroceryCount()
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Recepten',
      href: '/',
      icon: BookOpen,
    },
    {
      label: 'Boodschappen',
      href: '/boodschappen',
      icon: ShoppingCart,
      badge: uncheckedCount,
    },
    {
      label: 'Weekmenu',
      href: '/weekmenu',
      icon: Calendar,
    },
  ]

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card shadow-[0_-4px_10px_0_hsl(0_0%_0%_/_0.05)] sm:hidden">
      <div className="flex justify-around p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 transition-all ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
