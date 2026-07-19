import Chart from 'chart.js/auto'

export const CHART_FONT_FAMILY =
  '"MiSans VF", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
export const CHART_FONT_SIZE = 14
export const CHART_FONT_LINE_HEIGHT = 1.5

if (Chart.defaults?.font) {
  Object.assign(Chart.defaults.font, {
    family: CHART_FONT_FAMILY,
    lineHeight: CHART_FONT_LINE_HEIGHT,
    size: CHART_FONT_SIZE,
  })
}

export default Chart
