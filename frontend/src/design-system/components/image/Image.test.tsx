import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Image } from './Image'

const imageCss = readFileSync(resolve('src/design-system/components/image/image.css'), 'utf8')

describe('Image', () => {
  it('owns image fitting on its root contract', () => {
    render(
      <Image
        alt="品牌标志"
        background="transparent"
        fit="contain"
        showSkeleton={false}
        src="/orange.png"
      />,
    )

    expect(screen.getByAltText('品牌标志').parentElement).toHaveAttribute('data-fit', 'contain')
    expect(screen.getByAltText('品牌标志').parentElement).toHaveAttribute(
      'data-background',
      'transparent',
    )
  })

  it('keeps the shared load fade by default and can disable it through the root contract', () => {
    const { rerender } = render(<Image alt="品牌标志" src="/orange.png" />)
    const defaultImage = screen.getByAltText('品牌标志')
    const sharedImageRule = imageCss.match(/\.ods-image__img\s*\{([^}]+)\}/)?.[1]
    const disabledImageRule = imageCss.match(
      /\.ods-image\[data-disable-animation='true'\] \.ods-image__img\s*\{([^}]+)\}/,
    )?.[1]

    expect(defaultImage.parentElement).not.toHaveAttribute('data-disable-animation')
    expect(sharedImageRule).toContain('opacity: 0')
    expect(sharedImageRule).toContain(
      'transition: opacity var(--ods-duration-page) var(--ods-ease-standard)',
    )

    rerender(<Image alt="品牌标志" disableAnimation src="/orange.png" />)
    expect(screen.getByAltText('品牌标志').parentElement).toHaveAttribute(
      'data-disable-animation',
      'true',
    )
    expect(disabledImageRule).toContain('opacity: 1')
    expect(disabledImageRule).toContain('transition: none')
  })

  it('swaps to the fallback when the image errors', () => {
    render(<Image alt="头像" fallback={<span>加载失败</span>} src="/broken.png" />)
    fireEvent.error(screen.getByAltText('头像'))
    expect(screen.getByText('加载失败')).toBeInTheDocument()
  })

  it('retries when the image resource changes after a fallback', () => {
    const { rerender } = render(
      <Image alt="头像" fallback={<span>加载失败</span>} src="/broken.png" />,
    )
    fireEvent.error(screen.getByAltText('头像'))
    expect(screen.getByText('加载失败')).toBeInTheDocument()

    rerender(<Image alt="头像" fallback={<span>加载失败</span>} src="/working.png" />)
    const nextImage = screen.getByAltText('头像')
    expect(nextImage).toHaveAttribute('src', '/working.png')
    expect(nextImage.parentElement).toHaveAttribute('data-status', 'loading')

    fireEvent.load(nextImage)
    expect(nextImage.parentElement).toHaveAttribute('data-status', 'loaded')
  })

  it('does not reuse an old error when sources change again before loading completes', () => {
    const { rerender } = render(
      <Image alt="头像" fallback={<span>加载失败</span>} src="/first.png" />,
    )
    fireEvent.error(screen.getByAltText('头像'))

    rerender(<Image alt="头像" fallback={<span>加载失败</span>} src="/second.png" />)
    expect(screen.getByAltText('头像')).toHaveAttribute('src', '/second.png')

    rerender(<Image alt="头像" fallback={<span>加载失败</span>} src="/first.png" />)
    expect(screen.getByAltText('头像')).toHaveAttribute('src', '/first.png')
  })
})
