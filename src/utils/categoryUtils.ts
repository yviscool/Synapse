/**
 * Category Utilities
 *
 * Provides helper functions for working with categories,
 * including internationalized default categories.
 */

import type { Category } from '@/types/prompt'
import i18n from '@/i18n'

/**
 * Category definition with translation key
 */
interface CategoryDefinition {
  id: string
  translationKey: string
  sort: number
  icon: string
}

/**
 * Default category definitions
 * These are the base definitions that will be internationalized
 */
const DEFAULT_CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { id: 'creative', translationKey: 'creative', sort: 1, icon: 'i-carbon-idea' },
  { id: 'image', translationKey: 'image', sort: 2, icon: 'i-carbon-image' },
  { id: 'writing', translationKey: 'writing', sort: 3, icon: 'i-carbon-pen' },
  { id: 'coding', translationKey: 'coding', sort: 4, icon: 'i-carbon-code' },
  { id: 'analysis', translationKey: 'analysis', sort: 5, icon: 'i-carbon-chart-line' },
  { id: 'marketing', translationKey: 'marketing', sort: 6, icon: 'i-carbon-chart-bar' },
  { id: 'education', translationKey: 'education', sort: 7, icon: 'i-carbon-education' },
  { id: 'roleplay', translationKey: 'roleplay', sort: 8, icon: 'i-carbon-user-avatar' },
  { id: 'lifestyle', translationKey: 'lifestyle', sort: 9, icon: 'i-carbon-home' },
  { id: 'translation', translationKey: 'translation', sort: 10, icon: 'i-carbon-translate' },
  { id: 'other', translationKey: 'other', sort: 11, icon: 'i-carbon-help' },
]

/**
 * Gets the default categories with internationalized names
 *
 * @param locale - Optional locale override. If not provided, uses current i18n locale
 * @returns Array of Category objects with translated names
 */
export function getDefaultCategories(locale?: string): Category[] {
  const t = i18n.global.t

  return DEFAULT_CATEGORY_DEFINITIONS.map(def => ({
    id: def.id,
    name: t(`categories.defaultCategories.${def.translationKey}`),
    sort: def.sort,
    icon: def.icon,
  }))
}

/**
 * Gets a single translated category name by ID
 *
 * @param categoryId - The category ID
 * @returns The translated category name
 */
export function getCategoryNameById(categoryId: string): string {
  const t = i18n.global.t
  const definition = DEFAULT_CATEGORY_DEFINITIONS.find(def => def.id === categoryId)

  if (definition) {
    return t(`categories.defaultCategories.${definition.translationKey}`)
  }

  return categoryId
}

/**
 * Checks if a category ID is a default category
 *
 * @param categoryId - The category ID to check
 * @returns True if the category is a default category
 */
export function isDefaultCategory(categoryId: string): boolean {
  return DEFAULT_CATEGORY_DEFINITIONS.some(def => def.id === categoryId)
}

/**
 * Gets the icon for a default category
 *
 * @param categoryId - The category ID
 * @returns The icon class string, or undefined if not found
 */
export function getDefaultCategoryIcon(categoryId: string): string | undefined {
  const definition = DEFAULT_CATEGORY_DEFINITIONS.find(def => def.id === categoryId)
  return definition?.icon
}

/**
 * Gets all default category IDs
 *
 * @returns Array of default category IDs
 */
export function getDefaultCategoryIds(): string[] {
  return DEFAULT_CATEGORY_DEFINITIONS.map(def => def.id)
}
