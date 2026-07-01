package utils

// CalcPercentageTrend 计算百分比趋势（环比变化率）
//
// 参数:
//   - current: 当前周期的数值
//   - previous: 上一周期的数值
//
// 返回:
//   - float64: 环比增长百分比
//     - 如果 previous = 0 且 current > 0，返回 100 (代表从无到有)
//     - 如果 previous = 0 且 current = 0，返回 0
//     - 其他情况返回 ((current - previous) / previous) * 100
//
// 示例:
//   - CalcPercentageTrend(150, 100) = 50.0 (增长50%)
//   - CalcPercentageTrend(80, 100) = -20.0 (下降20%)
//   - CalcPercentageTrend(100, 0) = 100.0 (从无到有)
//   - CalcPercentageTrend(0, 0) = 0.0 (均为0)
func CalcPercentageTrend(current, previous float64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100
		}
		return 0
	}
	return ((current - previous) / previous) * 100
}
