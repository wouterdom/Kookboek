"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { BookOpen, ShoppingCart, Calendar, ChevronDown } from "lucide-react"
import { useGroceryCount } from "./grocery-count-provider"

interface NavigationItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export function NavigationDropdown() {
  const { uncheckedCount } = useGroceryCount()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine current section based on pathname
  const getCurrentSection = () => {
    if (pathname.startsWith('/boodschappen')) return 'Boodschappenlijst'
    if (pathname.startsWith('/weekmenu')) return 'Weekmenu'
    return 'Recepten'
  }

  const currentSection = getCurrentSection()

  // Get icon for current section
  const getCurrentIcon = () => {
    if (pathname.startsWith('/boodschappen')) return ShoppingCart
    if (pathname.startsWith('/weekmenu')) return Calendar
    return BookOpen
  }

  const CurrentIcon = getCurrentIcon()

  const navigationItems: NavigationItem[] = [
    {
      label: 'Recepten',
      href: '/',
      icon: BookOpen,
    },
    {
      label: 'Boodschappenlijst',
      href: '/boodschappen',
      icon: ShoppingCart,
    },
    {
      label: 'Weekmenu',
      href: '/weekmenu',
      icon: Calendar,
    },
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNavigation = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-all min-h-[44px] max-w-[140px] sm:max-w-[200px] ${
          isOpen
            ? "bg-accent text-accent-foreground"
            : "bg-transparent hover:bg-muted"
        }`}
      >
        <CurrentIcon className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm sm:text-base truncate">{currentSection}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[9999] mt-2 w-[200px] sm:w-auto sm:min-w-[220px] rounded-lg border bg-popover p-2 shadow-xl">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-all min-h-[44px] ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
