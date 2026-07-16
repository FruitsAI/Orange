import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar, AvatarGroup } from './Avatar'

describe('Avatar', () => {
  it('falls back to initials derived from the name', () => {
    render(<Avatar name="Wei Lan" />)
    expect(screen.getByText('WL')).toBeInTheDocument()
  })

  it('collapses overflow into a +N counter', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
        <Avatar name="D" />
      </AvatarGroup>,
    )
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})
