import dayjs, { type Dayjs } from 'dayjs'
import { forwardRef, useState, type HTMLAttributes } from 'react'

export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  max?: string
  min?: string
  onValueChange: (value: string) => void
  value?: string
}

type CalendarView = 'days' | 'months' | 'years'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const ISO_FORMAT = 'YYYY-MM-DD'
const YEARS_PER_PAGE = 12

// Monday-first grid: dayjs day() is 0=Sun..6=Sat, shift so Monday=0.
const mondayIndex = (date: Dayjs) => (date.day() + 6) % 7

const buildGrid = (visibleMonth: Dayjs) => {
  const firstOfMonth = visibleMonth.startOf('month')
  const gridStart = firstOfMonth.subtract(mondayIndex(firstOfMonth), 'day')
  return Array.from({ length: 42 }, (_, index) => gridStart.add(index, 'day'))
}

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  { className, max, min, onValueChange, value, ...props },
  ref,
) {
  const selected = value ? dayjs(value) : null
  const [visibleMonth, setVisibleMonth] = useState<Dayjs>((selected ?? dayjs()).startOf('month'))
  const [view, setView] = useState<CalendarView>('days')

  const minDate = min ? dayjs(min) : null
  const maxDate = max ? dayjs(max) : null
  const days = buildGrid(visibleMonth)
  const yearPageStart = Math.floor(visibleMonth.year() / YEARS_PER_PAGE) * YEARS_PER_PAGE
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPageStart + index)

  const isDisabled = (day: Dayjs) =>
    (minDate ? day.isBefore(minDate, 'day') : false) ||
    (maxDate ? day.isAfter(maxDate, 'day') : false)

  const navigate = (direction: 1 | -1) => {
    setVisibleMonth((month) => {
      if (view === 'days') return month.add(direction, 'month')
      if (view === 'months') return month.add(direction, 'year')
      return month.add(direction * YEARS_PER_PAGE, 'year')
    })
  }

  return (
    <div
      {...props}
      className={['ods-calendar', className].filter(Boolean).join(' ')}
      data-slot="calendar"
      data-view={view}
      ref={ref}
    >
      <div className="ods-calendar__header">
        <button
          aria-label={view === 'days' ? '上个月' : view === 'months' ? '上一年' : '前 12 年'}
          className="ods-calendar__nav"
          onClick={() => navigate(-1)}
          type="button"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <span aria-live="polite" className="ods-calendar__title">
          <button
            aria-label="选择年份"
            className="ods-calendar__title-button"
            data-active={view === 'years' || undefined}
            onClick={() => setView(view === 'years' ? 'days' : 'years')}
            type="button"
          >
            {view === 'years' ? `${yearPageStart} – ${yearPageStart + YEARS_PER_PAGE - 1}` : `${visibleMonth.year()} 年`}
          </button>
          {view === 'days' ? (
            <button
              aria-label="选择月份"
              className="ods-calendar__title-button"
              onClick={() => setView('months')}
              type="button"
            >
              {visibleMonth.month() + 1} 月
            </button>
          ) : null}
        </span>
        <button
          aria-label={view === 'days' ? '下个月' : view === 'months' ? '下一年' : '后 12 年'}
          className="ods-calendar__nav"
          onClick={() => navigate(1)}
          type="button"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {view === 'days' ? (
        <>
          <div aria-hidden="true" className="ods-calendar__weekdays">
            {WEEKDAYS.map((weekday) => (
              <span className="ods-calendar__weekday" key={weekday}>
                {weekday}
              </span>
            ))}
          </div>
          <div className="ods-calendar__grid" role="grid">
            {days.map((day) => {
              const outside = day.month() !== visibleMonth.month()
              const isSelected = selected ? day.isSame(selected, 'day') : false
              const isToday = day.isSame(dayjs(), 'day')
              return (
                <button
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  className="ods-calendar__day"
                  data-outside={outside || undefined}
                  data-selected={isSelected || undefined}
                  data-today={isToday || undefined}
                  disabled={isDisabled(day)}
                  key={day.format(ISO_FORMAT)}
                  onClick={() => onValueChange(day.format(ISO_FORMAT))}
                  type="button"
                >
                  {day.date()}
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      {view === 'months' ? (
        <div className="ods-calendar__picker-grid">
          {MONTHS.map((label, index) => {
            const isCurrent = visibleMonth.month() === index
            return (
              <button
                className="ods-calendar__picker-cell"
                data-selected={isCurrent || undefined}
                key={label}
                onClick={() => {
                  setVisibleMonth((month) => month.month(index))
                  setView('days')
                }}
                type="button"
              >
                {label}
              </button>
            )
          })}
        </div>
      ) : null}

      {view === 'years' ? (
        <div className="ods-calendar__picker-grid">
          {years.map((year) => {
            const isCurrent = visibleMonth.year() === year
            return (
              <button
                className="ods-calendar__picker-cell"
                data-selected={isCurrent || undefined}
                key={year}
                onClick={() => {
                  setVisibleMonth((month) => month.year(year))
                  setView('months')
                }}
                type="button"
              >
                {year}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
})
