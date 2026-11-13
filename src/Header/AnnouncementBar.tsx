import { ArrowRight, Leaf, X } from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

type Announcement = NonNullable<HeaderType['announcement']>
type AnnouncementMessage = NonNullable<Announcement['messages']>[number]

interface Props {
  announcement?: Announcement | null
}

export const AnnouncementBar: React.FC<Props> = ({ announcement }) => {
  const [dismissed, setDismissed] = useState(false)
  const messages = (announcement?.messages ?? []).filter(
    (message) => message.text || message.note || (message.linkLabel && message.linkUrl),
  )

  if (!messages.length && (announcement?.text || announcement?.note)) {
    messages.push({
      text: announcement.text ?? '',
      note: announcement.note,
      linkLabel: announcement.linkLabel,
      linkUrl: announcement.linkUrl,
      newTab: announcement.newTab,
    })
  }

  if (!announcement?.enabled || !messages.length || dismissed) return null

  const renderMessage = (message: AnnouncementMessage, index: number, duplicate = false) => {
    const content = (
      <>
        {message.text ? (
          <span className="text-caption text-green-900 inline-flex items-center gap-2 font-bold">
            <Leaf aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            {message.text}
          </span>
        ) : null}
        {message.note ? (
          <span className="text-caption text-green-900 font-bold">{message.note}</span>
        ) : null}
        {message.linkLabel && message.linkUrl ? (
          <span className="text-caption text-green-900 inline-flex items-center gap-1 font-bold underline decoration-green-900/70 underline-offset-4">
            {message.linkLabel}
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2.5}
            />
          </span>
        ) : null}
      </>
    )
    const className = 'announcement-message group text-green-900'

    if (duplicate || !message.linkUrl) {
      return (
        <span className={className} key={`${message.id ?? index}-${duplicate ? 'copy' : 'item'}`}>
          {content}
        </span>
      )
    }

    return (
      <Link
        className={`${className} focus-visible:-outline-offset-3 focus-visible:outline-3 focus-visible:outline-green-900 focus-visible:outline-solid`}
        href={message.linkUrl}
        key={message.id ?? index}
        {...(message.newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
      >
        {content}
      </Link>
    )
  }

  return (
    <div aria-label="Announcements" className="announcement-marquee bg-gold-400" role="region">
      <div className="announcement-viewport">
        <div className="announcement-track">
          <div className="announcement-group">
            {messages.map((message, index) => renderMessage(message, index))}
          </div>
          <div aria-hidden="true" className="announcement-group announcement-group-copy">
            {messages.map((message, index) => renderMessage(message, index, true))}
          </div>
        </div>
      </div>
      <button
        aria-label="Dismiss announcements"
        className="announcement-control text-green-900 hover:bg-gold-300 focus-visible:outline-green-900"
        onClick={() => setDismissed(true)}
        type="button"
      >
        <X aria-hidden="true" className="size-4" strokeWidth={2.25} />
      </button>
    </div>
  )
}
