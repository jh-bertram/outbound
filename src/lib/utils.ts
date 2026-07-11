import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Standard shadcn/ui class-merge helper — required by every generated
// src/components/ui/*.tsx component.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
