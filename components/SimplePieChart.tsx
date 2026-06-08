import { View, Text, StyleSheet } from 'react-native'
import Svg, { G, Path } from 'react-native-svg'

export type PieSlice = {
  label: string
  value: number
  color: string
}

type Props = {
  slices: PieSlice[]
  size?: number
  emptyLabel?: string
  textColor?: string
  subColor?: string
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

export default function SimplePieChart({
  slices,
  size = 200,
  emptyLabel = 'Không có dữ liệu',
  textColor = '#111',
  subColor = '#666',
}: Props) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4

  let angle = 0
  const paths: { d: string; color: string; key: string }[] = []
  for (const slice of slices) {
    if (slice.value <= 0) continue
    const sweep = (slice.value / total) * 360
    if (sweep >= 359.99) {
      paths.push({
        d: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`,
        color: slice.color,
        key: slice.label,
      })
    } else {
      paths.push({
        d: describeSlice(cx, cy, r, angle, angle + sweep),
        color: slice.color,
        key: slice.label,
      })
    }
    angle += sweep
  }

  return (
    <View style={styles.wrap}>
      {total === 0 ? (
        <View style={[styles.emptyCircle, { width: size, height: size, borderColor: subColor }]}>
          <Text style={[styles.emptyText, { color: subColor }]}>{emptyLabel}</Text>
        </View>
      ) : (
        <Svg width={size} height={size}>
          <G>
            {paths.map((p) => (
              <Path key={p.key} d={p.d} fill={p.color} />
            ))}
          </G>
        </Svg>
      )}
      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={[styles.legendLabel, { color: textColor }]}>{slice.label}</Text>
            <Text style={[styles.legendValue, { color: subColor }]}>{slice.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  emptyCircle: {
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },
  legend: { width: '100%', marginTop: 16, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { flex: 1, fontSize: 14 },
  legendValue: { fontSize: 14, fontWeight: '600', minWidth: 28, textAlign: 'right' },
})
