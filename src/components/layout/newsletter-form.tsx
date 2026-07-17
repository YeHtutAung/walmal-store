'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

/**
 * Footer newsletter signup — DECORATIVE ONLY (spec decision for the Walmal
 * Sport reskin). There is no subscription backend/endpoint; submitting just
 * shows a success toast and clears the input. Do not wire this to an API
 * without an explicit follow-up task.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    toast.success('You are on the list — 10% off your first order.')
    setEmail('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[300px] gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        aria-label="Email address"
        className="w-full min-w-0 rounded-[10px] border border-[#2a2a30] bg-card px-3.5 py-[11px] text-[13.5px] text-foreground placeholder:text-muted-foreground focus:border-[#3a3a42] focus:outline-none"
      />
      <button
        type="submit"
        className="label-caps shrink-0 rounded-[10px] bg-primary px-4 py-[11px] text-[12px] text-primary-foreground transition-colors hover:bg-primary/85"
      >
        Join
      </button>
    </form>
  )
}
