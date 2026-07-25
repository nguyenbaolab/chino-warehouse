import { useEffect, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Svg, { Rect } from 'react-native-svg'

/** B11 — splash động khi bootstrap locations + products sau login */

type Props = {
  isDataReady: boolean
  onComplete: () => void
}

const BOX = 200
const STROKE = 3
const RADIUS = 28
const ACCENT = '#22C55E'
const BG = '#111111'

const AnimatedRect = Animated.createAnimatedComponent(Rect)

/** Chu vi rounded rect (stroke centered) */
function roundedRectPerimeter(width: number, height: number, rx: number): number {
  const r = Math.min(rx, width / 2, height / 2)
  return 2 * (width + height - 2 * r) + 2 * Math.PI * r
}

const RECT_SIZE = BOX - STROKE
const PERIMETER = roundedRectPerimeter(RECT_SIZE, RECT_SIZE, RADIUS)

export default function AppLoadingScreen({ isDataReady, onComplete }: Props) {
  const progress = useRef(new Animated.Value(0)).current
  const dataReadyRef = useRef(isDataReady)
  const phaseRef = useRef<'to90' | 'holding' | 'to100' | 'done'>('to90')
  const onCompleteRef = useRef(onComplete)
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const runTo100 = (fromValue: number) => {
    if (phaseRef.current === 'to100' || phaseRef.current === 'done') return
    phaseRef.current = 'to100'
    progress.stopAnimation()
    progress.setValue(fromValue)
    Animated.timing(progress, {
      toValue: 100,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished || phaseRef.current === 'done') return
      phaseRef.current = 'done'
      finishTimeoutRef.current = setTimeout(() => {
        onCompleteRef.current()
      }, 200)
    })
  }

  // Mount: 0 → 90 (~1400ms, ease-out)
  useEffect(() => {
    phaseRef.current = 'to90'
    Animated.timing(progress, {
      toValue: 90,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return
      if (dataReadyRef.current) {
        runTo100(90)
      } else {
        phaseRef.current = 'holding'
      }
    })

    return () => {
      progress.stopAnimation()
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current)
        finishTimeoutRef.current = null
      }
    }
    // Chỉ chạy một lần khi mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // isDataReady true → cắt tới 100 (từ giá trị hiện tại hoặc từ 90 nếu đang holding)
  useEffect(() => {
    dataReadyRef.current = isDataReady
    if (!isDataReady) return
    if (phaseRef.current === 'to100' || phaseRef.current === 'done') return

    if (phaseRef.current === 'holding') {
      runTo100(90)
      return
    }

    if (phaseRef.current === 'to90') {
      progress.stopAnimation((value) => {
        runTo100(typeof value === 'number' ? value : 0)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataReady])

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [PERIMETER, 0],
  })

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.boxWrap}>
        <Svg width={BOX} height={BOX} style={StyleSheet.absoluteFill}>
          {/* Track mờ */}
          <Rect
            x={STROKE / 2}
            y={STROKE / 2}
            width={RECT_SIZE}
            height={RECT_SIZE}
            rx={RADIUS}
            ry={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={STROKE}
          />
          {/* Progress stroke */}
          <AnimatedRect
            x={STROKE / 2}
            y={STROKE / 2}
            width={RECT_SIZE}
            height={RECT_SIZE}
            rx={RADIUS}
            ry={RADIUS}
            fill="none"
            stroke={ACCENT}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${PERIMETER} ${PERIMETER}`}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
        <Image
          source={require('../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  boxWrap: {
    width: BOX,
    height: BOX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: BOX - 48,
    height: BOX - 48,
    borderRadius: 16,
  },
})
