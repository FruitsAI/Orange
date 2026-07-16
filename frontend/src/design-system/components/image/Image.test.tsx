import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Image } from './Image'

describe('Image', () => {
  it('swaps to the fallback when the image errors', () => {
    render(<Image alt="头像" fallback={<span>加载失败</span>} src="/broken.png" />)
    fireEvent.error(screen.getByAltText('头像'))
    expect(screen.getByText('加载失败')).toBeInTheDocument()
  })
})
