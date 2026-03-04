'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { updateThought } from '@/memory/session'

interface TagEditorProps {
  thoughtId: string
  initialTags: string[]
}

export default function TagEditor({ thoughtId, initialTags }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [input, setValue] = useState('')

  useEffect(() => { setTags(initialTags) }, [initialTags])

  const addTag = () => {
    const tag = input.trim().toLowerCase()
    if (!tag || tags.includes(tag)) { setValue(''); return }
    const next = [...tags, tag]
    setTags(next)
    updateThought(thoughtId, { tags: next })
    setValue('')
  }

  const removeTag = (tag: string) => {
    const next = tags.filter(t => t !== tag)
    setTags(next)
    updateThought(thoughtId, { tags: next })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag() }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs bg-surface border border-border rounded-full px-2 py-0.5 text-muted"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag} tag`}
            className="text-muted hover:text-primary leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag…"
        aria-label="Add tag"
        className="text-xs bg-transparent text-muted placeholder:text-muted border-b border-border focus:outline-none focus:border-accent w-20 py-0.5"
      />
    </div>
  )
}
