import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  LogOut,
  MessageSquare,
  PanelLeftClose,
  Search,
  Sparkles,
  SquarePen,
  Trash2,
  VenetianMask,
} from 'lucide-react'
import type { Conversation } from '../../lib/ai/types'
import { useAuth } from '../../lib/auth/auth'
import { body } from '../../lib/fonts'

interface ChatSidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onNew: () => void
  onNewIncognito: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  // Collapses (desktop) or closes (mobile drawer) the sidebar.
  onClose?: () => void
}

export default function ChatSidebar({
  conversations,
  activeId,
  onNew,
  onNewIncognito,
  onSelect,
  onDelete,
  onClose,
}: ChatSidebarProps) {
  const [query, setQuery] = useState('')
  const { user, isConfigured, signOut } = useAuth()

  // Incognito chats never appear in the list. A brand-new empty chat only shows
  // up once it has messages, but saved summaries (loaded === false, messages not
  // fetched yet) are always shown.
  const recents = conversations.filter(
    (c) => !c.incognito && (c.messages.length > 0 || c.loaded === false),
  )
  const q = query.trim().toLowerCase()
  const filtered = q
    ? recents.filter((c) => c.title.toLowerCase().includes(q))
    : recents

  const email = user?.email ?? ''
  const initial = (email.trim()[0] || 'S').toUpperCase()

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-[#0B6477]/10 bg-[#F3F7F6]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2 px-1 text-neutral-800">
          <Sparkles className="h-[18px] w-[18px] text-[#14919B]" />
          <span className="text-sm font-semibold tracking-[-0.01em]" style={body}>
            AI Assistant
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-neutral-800"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-col gap-0.5 px-2">
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-white"
          style={body}
        >
          <SquarePen className="h-[18px] w-[18px] text-[#0B6477]" />
          New chat
        </button>
        <button
          type="button"
          onClick={onNewIncognito}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-neutral-600 transition-colors hover:bg-white"
          style={body}
        >
          <VenetianMask className="h-[18px] w-[18px] text-neutral-400" />
          Incognito chat
        </button>
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 focus-within:bg-white">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
            style={body}
          />
        </div>
      </div>

      {/* Recent */}
      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-2">
        <div
          className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400"
          style={body}
        >
          Recent
        </div>
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs leading-relaxed text-neutral-400" style={body}>
            {recents.length === 0
              ? 'No conversations yet. Start a new chat to see it here.'
              : 'No chats match your search.'}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((c) => {
              const isActive = c.id === activeId
              return (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-xl pr-1 transition-colors ${
                    isActive ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#0B6477]' : 'text-neutral-400'}`}
                    />
                    <span
                      className={`truncate text-sm ${isActive ? 'text-neutral-900' : 'text-neutral-600'}`}
                      style={body}
                    >
                      {c.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    aria-label="Delete conversation"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 opacity-0 transition-opacity hover:bg-[#0B6477]/10 hover:text-[#B91C1C] focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Account */}
      {isConfigured && user ? (
        <div className="border-t border-[#0B6477]/10 p-2">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <Link
              to="/ai/profile"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 transition-colors hover:opacity-80"
              aria-label="Profile and settings"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B6477] text-sm font-semibold text-[#45DFB1]">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-neutral-700" style={body}>
                  {email}
                </div>
                <div className="text-[11px] text-neutral-400" style={body}>
                  Profile &amp; settings
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white hover:text-[#B91C1C]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
