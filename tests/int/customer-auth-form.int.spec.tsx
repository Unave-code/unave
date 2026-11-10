import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { CustomerAuth } from '@/components/CustomerAuth'
import { PasswordForm } from '@/components/CustomerAuth/PasswordForm'

/**
 * The browser half of the credential rules.
 *
 * These run against the real component in jsdom, so they prove the thing that is
 * easy to get wrong: that Zod is the check the form actually uses. The form carries
 * `noValidate`, and the first test pins it — without that attribute the browser's
 * `required` and `type="email"` checks swallow the submit event and Zod's messages
 * never render.
 *
 * The last block renders `CustomerAuth` itself rather than the bare form, because
 * the screens choose their own endpoint: a sign-up card posting to the login route
 * would fail every account silently, and only the wired component can say so.
 */

afterEach(cleanup)

const signIn = () =>
  render(
    <PasswordForm
      action="/api/customers/login"
      emailField
      idPrefix="signin"
      intent="sign-in"
      password={{ autoComplete: 'current-password', hint: null, label: 'Password' }}
      submit="Sign in"
    />,
  )

const signUp = () =>
  render(
    <PasswordForm
      action="/api/customers/register"
      emailField
      fields={[
        {
          autoComplete: 'name',
          id: 'signup-name',
          label: 'Your name',
          name: 'name',
          required: true,
        },
        {
          autoComplete: 'tel',
          id: 'signup-phone',
          inputMode: 'tel',
          label: 'Phone number',
          name: 'phone',
          required: true,
          type: 'tel',
        },
      ]}
      idPrefix="signup"
      intent="sign-up"
      submit="Sign up"
    />,
  )

const forgot = () =>
  render(
    <PasswordForm
      action="/api/customers/forgot-password"
      emailField
      idPrefix="forgot"
      intent="forgot"
      password={false}
      submit="Email me"
    />,
  )

const formOf = (container: HTMLElement) => container.querySelector('form') as HTMLFormElement

const type = (label: string, value: string) => {
  fireEvent.input(screen.getByLabelText(label), { target: { value } })
}

describe('the form defers validation to Zod', () => {
  it('turns off the browser layer that would otherwise hide Zod', () => {
    const { container } = signIn()

    expect(formOf(container).noValidate).toBe(true)
  })

  it('reports an empty sign-in against both fields', () => {
    const { container } = signIn()

    fireEvent.submit(formOf(container))

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy()
    expect(screen.getByText('Enter your password.')).toBeTruthy()
  })

  it('reports a password under the minimum on sign up', () => {
    const { container } = signUp()

    type('Email address', 'priya@example.com')
    type('Password', 'short')
    fireEvent.submit(formOf(container))

    expect(screen.getByText('Use at least 10 characters.')).toBeTruthy()
    expect(screen.queryByText('Please enter a valid email address.')).toBeNull()
  })

  it('accepts a sign up that meets every rule the card asks for', () => {
    const { container } = signUp()

    type('Email address', 'priya@example.com')
    type('Your name', 'Priya Kale')
    type('Phone number', '9876543210')
    type('Password', 'longenough1')
    fireEvent.submit(formOf(container))

    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0)
  })

  it('leaves the address alone on the forgot card, which asks for no password', () => {
    const { container } = forgot()

    fireEvent.submit(formOf(container))

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy()
    expect(screen.queryByText('Enter your password.')).toBeNull()
  })
})

describe('the field checks itself on blur', () => {
  it('names the address as it is left', () => {
    signIn()

    const email = screen.getByLabelText('Email address')
    fireEvent.input(email, { target: { value: 'not-an-address' } })
    fireEvent.focusOut(email)

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy()
  })

  it('drops the message once the value is corrected', () => {
    signIn()

    const email = screen.getByLabelText('Email address')
    fireEvent.input(email, { target: { value: 'not-an-address' } })
    fireEvent.focusOut(email)
    fireEvent.input(email, { target: { value: 'priya@example.com' } })

    expect(screen.queryByText('Please enter a valid email address.')).toBeNull()
  })
})

describe('the account screen posts each card to its own endpoint', () => {
  it('sends the sign-in card to the login route', () => {
    const { container } = render(<CustomerAuth mode="sign-in" />)

    expect(formOf(container).getAttribute('action')).toBe('/api/customers/login')
  })

  it('sends the sign-up card to the register route, which is the one that creates an account', () => {
    const { container } = render(<CustomerAuth mode="sign-up" />)

    expect(formOf(container).getAttribute('action')).toBe('/api/customers/register')
  })
})

describe('the sign-up card asks for who the customer is, and leaves the address to onboarding', () => {
  it('asks for the name and the phone, and never for the address', () => {
    render(<CustomerAuth mode="sign-up" />)

    expect(screen.getByLabelText('Your name')).toBeTruthy()
    expect(screen.getByLabelText('Phone number')).toBeTruthy()
    expect(screen.queryByLabelText('Address line 1')).toBeNull()
  })

  it('asks only for the credentials on sign in', () => {
    render(<CustomerAuth mode="sign-in" />)

    expect(screen.queryByLabelText('Your name')).toBeNull()
    expect(screen.queryByLabelText('Phone number')).toBeNull()
  })
})
