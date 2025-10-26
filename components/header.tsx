"use client"

import { ChefHat } from "lucide-react"
import { NavigationDropdown } from "./navigation-dropdown"

interface HeaderProps {
  children?: React.ReactNode
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline text-xl font-semibold font-[Montserrat]">Kookboek</span>
          </div>

          {/* Navigation Dropdown */}
          <NavigationDropdown />
        </div>

        {/* Action Buttons (right side) - passed as children */}
        {children && (
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {children}
          </div>
        )}
      </div>
    </header>
  )
}
