import { describe, expect, it } from 'vitest'
import Chart, {
  CHART_FONT_FAMILY,
  CHART_FONT_LINE_HEIGHT,
  CHART_FONT_SIZE,
} from './chart'

describe('Chart configuration', () => {
  it('uses the local MiSans typography defaults across every chart', () => {
    expect(CHART_FONT_FAMILY).toContain('MiSans VF')
    expect(Chart.defaults.font).toMatchObject({
      family: CHART_FONT_FAMILY,
      lineHeight: CHART_FONT_LINE_HEIGHT,
      size: CHART_FONT_SIZE,
    })
    expect(CHART_FONT_SIZE).toBe(14)
    expect(CHART_FONT_LINE_HEIGHT).toBe(1.5)
  })
})
