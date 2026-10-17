import { useEffect, useState, type CSSProperties } from 'react'

const clockMarkers = Array.from({ length: 12 }, (_, index) => index)
const clockNumerals = [
  { className: 'dashboard-clock__numeral--twelve', value: '12' },
  { className: 'dashboard-clock__numeral--three', value: '3' },
  { className: 'dashboard-clock__numeral--six', value: '6' },
  { className: 'dashboard-clock__numeral--nine', value: '9' },
]
const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const padTimeUnit = (value: number) => String(value).padStart(2, '0')

const handStyle = (angle: number) => ({ '--dashboard-clock-angle': `${angle}deg` }) as CSSProperties

export default function DashboardClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const timeText = `${padTimeUnit(hours)}:${padTimeUnit(minutes)}`
  const secondsText = `:${padTimeUnit(seconds)}`
  const dateText = `${now.getMonth() + 1}月${now.getDate()}日`
  const weekdayText = weekdays[now.getDay()]
  const accessibleLabel = `本地时间 ${dateText} ${weekdayText} ${timeText}${secondsText}`
  const hourAngle = ((hours % 12) + minutes / 60 + seconds / 3600) * 30
  const minuteAngle = (minutes + seconds / 60) * 6
  const secondAngle = seconds * 6

  return (
    <div aria-label={accessibleLabel} aria-live="off" className="dashboard-clock" role="group">
      <div aria-hidden="true" className="dashboard-clock__face">
        {clockMarkers.map((marker) => (
          <span
            className="dashboard-clock__marker"
            data-major={marker % 3 === 0 || undefined}
            key={marker}
            style={{ '--dashboard-clock-index': marker } as CSSProperties}
          />
        ))}
        {clockNumerals.map((numeral) => (
          <span className={`dashboard-clock__numeral ${numeral.className}`} key={numeral.value}>
            {numeral.value}
          </span>
        ))}
        <span
          className="dashboard-clock__hand dashboard-clock__hand--hour"
          style={handStyle(hourAngle)}
        />
        <span
          className="dashboard-clock__hand dashboard-clock__hand--minute"
          style={handStyle(minuteAngle)}
        />
        <span
          className="dashboard-clock__hand dashboard-clock__hand--second"
          style={handStyle(secondAngle)}
        />
        <span className="dashboard-clock__hub" />
      </div>

      <div className="dashboard-clock__readout">
        <span className="dashboard-clock__label">本地时间</span>
        <time className="dashboard-clock__time" dateTime={now.toISOString()}>
          {timeText}
          <span className="dashboard-clock__seconds">{secondsText}</span>
        </time>
        <span className="dashboard-clock__date">
          {dateText} · {weekdayText}
        </span>
      </div>
    </div>
  )
}
