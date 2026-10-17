package utils

import "time"

// PeriodRange 表示一个时间范围
type PeriodRange struct {
	StartDate string // 开始日期 (格式: "2006-01-02")
	EndDate   string // 结束日期 (格式: "2006-01-02 23:59:59")
}

// GetPeriodRange 根据周期类型和偏移量计算时间范围
//
// 参数:
//   - period: 周期类型 ("week", "month", "quarter", "year")
//   - offset: 偏移量（0 = 当前周期，1 = 上一周期，2 = 上上周期）
//
// 返回:
//   - PeriodRange: 计算后的时间范围
//
// 周期说明:
//   - week: 过去7天
//   - month: 过去30天
//   - quarter: 过去3个月（90天）
//   - year: 过去1年（365天）
//
// 示例:
//   - GetPeriodRange("week", 0) = 最近7天 (今天往前推6天 ~ 今天)
//   - GetPeriodRange("week", 1) = 上周 (7-13天前)
//   - GetPeriodRange("month", 0) = 最近30天
//   - GetPeriodRange("month", 1) = 上个月 (30-59天前)
func GetPeriodRange(period string, offset int) PeriodRange {
	now := time.Now()

	var startDays, endDays int

	switch period {
	case "week":
		// 本周: 过去7天 (offset=0: 0~6天前)
		// 上周: 7~13天前 (offset=1: 7~13天前)
		endDays = offset * 7
		startDays = endDays + 6

	case "month":
		// 本月: 过去30天 (offset=0: 0~29天前)
		// 上月: 30~59天前 (offset=1: 30~59天前)
		endDays = offset * 30
		startDays = endDays + 29

	case "quarter":
		// 本季度: 过去3个月 (offset=0: 0~89天前)
		// 上季度: 90~179天前 (offset=1: 90~179天前)
		endDays = offset * 90
		startDays = endDays + 89

	case "year":
		// 本年: 过去1年 (offset=0: 0~364天前)
		// 去年: 365~729天前 (offset=1: 365~729天前)
		endDays = offset * 365
		startDays = endDays + 364

	default:
		// 默认返回本月
		endDays = 0
		startDays = 29
	}

	startDate := now.AddDate(0, 0, -startDays).Format("2006-01-02")
	endDate := now.AddDate(0, 0, -endDays).Format("2006-01-02") + " 23:59:59"

	return PeriodRange{
		StartDate: startDate,
		EndDate:   endDate,
	}
}

// GetCurrentAndPreviousPeriod 一次性获取当前周期和上一周期的时间范围
//
// 参数:
//   - period: 周期类型 ("week", "month", "quarter", "year")
//
// 返回:
//   - current: 当前周期范围
//   - previous: 上一周期范围
func GetCurrentAndPreviousPeriod(period string) (current, previous PeriodRange) {
	return GetPeriodRange(period, 0), GetPeriodRange(period, 1)
}
