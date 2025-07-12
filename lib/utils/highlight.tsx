import React from 'react'

export function highlightMatches(text: string, searchQuery: string): React.ReactNode[] {
  if (!searchQuery.trim()) {
    return [text]
  }

  const searchTerms = searchQuery
    .toLowerCase()
    .split(' ')
    .filter(term => term.length > 0)

  if (searchTerms.length === 0) {
    return [text]
  }

  // Create a regex that matches any of the search terms
  const regex = new RegExp(`(${searchTerms.map(term => 
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
  ).join('|')})`, 'gi')

  const parts = text.split(regex)
  const result: React.ReactNode[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part === '') continue // Skip empty parts
    
    if (i % 2 === 1) {
      // This is a match - highlight it
      result.push(
        <span 
          key={i}
          className="bg-green-500/30 text-green-400 rounded px-0.5"
        >
          {part}
        </span>
      )
    } else {
      // This is regular text
      result.push(part)
    }
  }

  return result
}