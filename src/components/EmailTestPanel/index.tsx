'use client'

import { Button, TextInput, toast, useAuth } from '@payloadcms/ui'
import React, { useState } from 'react'

import { hasAdminRole } from '@/access/isAdmin'

type TestResponse = {
  message?: string
  status?: string
  transport?: string
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '4px',
  marginBottom: '2rem',
  padding: '1.5rem',
}

const headingStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  margin: '0 0 0.35rem',
}

const copyStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-600)',
  fontSize: '0.85rem',
  margin: '0 0 1rem',
}

const actionsStyle: React.CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  gap: '1rem',
  marginTop: '1rem',
}

export const EmailTestPanel: React.FC = () => {
  const { user } = useAuth()
  const [to, setTo] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<null | string>(null)

  if (!hasAdminRole(user)) return null

  const sendTest = async (event: React.MouseEvent, kind: 'order' | 'plain') => {
    event.preventDefault()
    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/test', {
        body: JSON.stringify({ kind, to }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json().catch(() => ({}))) as TestResponse

      if (response.status === 429) {
        toast.error('The hourly test limit is reached. Try again later.')
        return
      }

      if (!response.ok) {
        toast.error(body.message ?? 'The test email could not be sent.')
        return
      }

      const label = `Result: ${body.status ?? 'unknown'} through ${body.transport ?? 'none'}.`
      setResult(label)
      toast.success('Test email handed to the mail path.')
    } catch {
      toast.error('The test email could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={panelStyle}>
      <h3 style={headingStyle}>Send a test email</h3>
      <p style={copyStyle}>
        Send a short plain message to check mail works, or a sample order confirmation to see the saved images
        and content in a real inbox. Save your changes first. Five sends per hour.
      </p>
      <TextInput
        label="Send to"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTo(event.target.value)}
        path="emailTestAddress"
        placeholder="you@example.com"
        value={to}
      />
      <div style={actionsStyle}>
        <Button
          buttonStyle="primary"
          disabled={sending || to.trim().length === 0}
          onClick={(event) => sendTest(event, 'order')}
          size="medium"
          type="button"
        >
          {sending ? 'Sending...' : 'Send sample order confirmation'}
        </Button>
        <Button
          buttonStyle="secondary"
          disabled={sending || to.trim().length === 0}
          onClick={(event) => sendTest(event, 'plain')}
          size="medium"
          type="button"
        >
          Send plain test
        </Button>
        {result ? <span>{result}</span> : null}
      </div>
    </div>
  )
}

export default EmailTestPanel
