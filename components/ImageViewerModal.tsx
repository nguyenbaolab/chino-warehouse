import { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_MS = 300

type Props = {
  uri: string | null
  onClose: () => void
  onChangeImage?: () => void
}

function touchDistance(touches: ReadonlyArray<{ pageX: number; pageY: number }>): number {
  if (touches.length < 2) return 0
  const [a, b] = touches
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)
}

export default function ImageViewerModal({ uri, onClose, onChangeImage }: Props) {
  const insets = useSafeAreaInsets()
  const scale = useRef(new Animated.Value(1)).current
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current

  const scaleRef = useRef(1)
  const translateXRef = useRef(0)
  const translateYRef = useRef(0)
  const lastPinchDistance = useRef<number | null>(null)
  const panOriginX = useRef(0)
  const panOriginY = useRef(0)
  const lastTapAt = useRef(0)

  const resetTransform = () => {
    scaleRef.current = MIN_SCALE
    translateXRef.current = 0
    translateYRef.current = 0
    lastPinchDistance.current = null
    scale.setValue(MIN_SCALE)
    translateX.setValue(0)
    translateY.setValue(0)
  }

  useEffect(() => {
    if (uri) resetTransform()
  }, [uri])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => uri !== null,
        onMoveShouldSetPanResponder: () => uri !== null,
        onPanResponderGrant: (evt) => {
          if (evt.nativeEvent.touches.length >= 2) {
            lastPinchDistance.current = touchDistance(evt.nativeEvent.touches)
            return
          }
          lastPinchDistance.current = null
          panOriginX.current = translateXRef.current
          panOriginY.current = translateYRef.current
        },
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches
          if (touches.length >= 2) {
            const distance = touchDistance(touches)
            if (lastPinchDistance.current != null && lastPinchDistance.current > 0) {
              let nextScale = scaleRef.current * (distance / lastPinchDistance.current)
              nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
              scaleRef.current = nextScale
              scale.setValue(nextScale)
              if (nextScale <= MIN_SCALE) {
                translateXRef.current = 0
                translateYRef.current = 0
                translateX.setValue(0)
                translateY.setValue(0)
              }
            }
            lastPinchDistance.current = distance
            return
          }

          if (scaleRef.current > MIN_SCALE) {
            translateX.setValue(panOriginX.current + gestureState.dx)
            translateY.setValue(panOriginY.current + gestureState.dy)
          }
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (scaleRef.current > MIN_SCALE) {
            translateXRef.current = panOriginX.current + gestureState.dx
            translateYRef.current = panOriginY.current + gestureState.dy
          }
          lastPinchDistance.current = null

          const moved = Math.hypot(gestureState.dx, gestureState.dy)
          const now = Date.now()
          if (moved < 10) {
            if (now - lastTapAt.current < DOUBLE_TAP_MS) {
              resetTransform()
              lastTapAt.current = 0
              return
            }
            lastTapAt.current = now
          }
        },
      }),
    [uri],
  )

  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.headerText}>Đóng</Text>
          </TouchableOpacity>
          {onChangeImage ? (
            <TouchableOpacity
              onPress={onChangeImage}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.headerText}>Đổi ảnh</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        <View style={styles.imageWrap} {...panResponder.panHandlers}>
          {uri ? (
            <Animated.Image
              source={{ uri }}
              style={[
                styles.image,
                { transform: [{ translateX }, { translateY }, { scale }] },
              ]}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 1,
  },
  headerText: {
    color: 'white',
    fontSize: 16,
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    flex: 1,
    width: '100%',
  },
})
