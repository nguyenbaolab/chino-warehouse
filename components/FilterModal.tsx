import { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useThemeStore } from '../stores/themeStore'
import type { Location, Zone } from '../types'

export type FilterMode = 'all' | 'warehouse' | 'market'

type FilterModalProps = {
  visible: boolean
  onClose: () => void
  selectedMode: FilterMode
  onChangeMode: (mode: FilterMode) => void
  locations: Location[]
  selectedLocationId: string | null
  onChangeLocation: (id: string | null) => void
  zones: Zone[]
  selectedZoneId: string | null
  onChangeZone: (id: string | null) => void
  onReset: () => void
}

const MODE_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'warehouse', label: 'Kho' },
  { value: 'market', label: 'Siêu thị' },
]

/** Đếm filter đang active — dùng cho badge nút Lọc bên ngoài. */
export function countActiveFilters(
  mode: FilterMode,
  locationId: string | null,
  zoneId: string | null,
): number {
  return (mode !== 'all' ? 1 : 0) + (locationId ? 1 : 0) + (zoneId ? 1 : 0)
}

export default function FilterModal({
  visible,
  onClose,
  selectedMode,
  onChangeMode,
  locations,
  selectedLocationId,
  onChangeLocation,
  zones,
  selectedZoneId,
  onChangeZone,
  onReset,
}: FilterModalProps) {
  const { colors } = useThemeStore()
  const [locationListOpen, setLocationListOpen] = useState(false)
  const [zoneListOpen, setZoneListOpen] = useState(false)

  const locationLabel = selectedLocationId
    ? locations.find((l) => l.id === selectedLocationId)?.name ?? '…'
    : 'Tất cả kho'
  const zoneLabel = selectedZoneId
    ? zones.find((z) => z.id === selectedZoneId)?.name ?? '…'
    : 'Tất cả zone'
  const zoneDisabled = !selectedLocationId

  function handleClose() {
    setLocationListOpen(false)
    setZoneListOpen(false)
    onClose()
  }

  function handleMode(mode: FilterMode) {
    onChangeMode(mode)
    setLocationListOpen(false)
    setZoneListOpen(false)
  }

  function handleLocation(id: string | null) {
    onChangeLocation(id)
    setLocationListOpen(false)
    setZoneListOpen(false)
  }

  function handleZone(id: string | null) {
    onChangeZone(id)
    setZoneListOpen(false)
  }

  function handleReset() {
    setLocationListOpen(false)
    setZoneListOpen(false)
    onReset()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.box, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.text }]}>Bộ lọc</Text>

          <Text style={[styles.sectionLabel, { color: colors.sub }]}>Mode</Text>
          <View style={styles.modeRow}>
            {MODE_OPTIONS.map((opt) => {
              const active = selectedMode === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.modeBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: active ? colors.accent + '22' : colors.bg,
                    },
                  ]}
                  onPress={() => handleMode(opt.value)}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.sub }]}>Kho</Text>
          <TouchableOpacity
            style={[styles.dropdownBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => {
              setLocationListOpen((v) => !v)
              setZoneListOpen(false)
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.dropdownValue, { color: colors.text }]} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Text style={{ color: colors.sub }}>▾</Text>
          </TouchableOpacity>
          {locationListOpen ? (
            <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: selectedLocationId ? colors.card : colors.accent + '22',
                  },
                ]}
                onPress={() => handleLocation(null)}
              >
                <Text style={[styles.optionText, { color: colors.text, fontWeight: selectedLocationId ? '500' : '700' }]}>
                  Tất cả kho
                </Text>
                {!selectedLocationId ? <Text style={{ color: colors.accent }}>✓</Text> : null}
              </TouchableOpacity>
              {locations.map((loc) => {
                const sel = selectedLocationId === loc.id
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.optionRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: sel ? colors.accent + '22' : colors.card,
                      },
                    ]}
                    onPress={() => handleLocation(loc.id)}
                  >
                    <Text
                      style={[styles.optionText, { color: colors.text, fontWeight: sel ? '700' : '500' }]}
                      numberOfLines={2}
                    >
                      {loc.name}
                    </Text>
                    {sel ? <Text style={{ color: colors.accent }}>✓</Text> : null}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.sub }]}>Zone</Text>
          <TouchableOpacity
            style={[
              styles.dropdownBtn,
              {
                backgroundColor: colors.bg,
                borderColor: colors.border,
                opacity: zoneDisabled ? 0.45 : 1,
              },
            ]}
            onPress={() => {
              if (zoneDisabled) return
              setZoneListOpen((v) => !v)
              setLocationListOpen(false)
            }}
            activeOpacity={zoneDisabled ? 1 : 0.75}
            disabled={zoneDisabled}
          >
            <Text
              style={[
                styles.dropdownValue,
                { color: zoneDisabled ? colors.sub : colors.text },
              ]}
              numberOfLines={1}
            >
              {zoneDisabled ? 'Chọn kho trước' : zoneLabel}
            </Text>
            <Text style={{ color: colors.sub }}>▾</Text>
          </TouchableOpacity>
          {zoneListOpen && !zoneDisabled ? (
            <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: selectedZoneId ? colors.card : colors.accent + '22',
                  },
                ]}
                onPress={() => handleZone(null)}
              >
                <Text style={[styles.optionText, { color: colors.text, fontWeight: selectedZoneId ? '500' : '700' }]}>
                  Tất cả zone
                </Text>
                {!selectedZoneId ? <Text style={{ color: colors.accent }}>✓</Text> : null}
              </TouchableOpacity>
              {zones.map((zone) => {
                const sel = selectedZoneId === zone.id
                return (
                  <TouchableOpacity
                    key={zone.id}
                    style={[
                      styles.optionRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: sel ? colors.accent + '22' : colors.card,
                      },
                    ]}
                    onPress={() => handleZone(zone.id)}
                  >
                    <Text
                      style={[styles.optionText, { color: colors.text, fontWeight: sel ? '700' : '500' }]}
                      numberOfLines={2}
                    >
                      {zone.name}
                    </Text>
                    {sel ? <Text style={{ color: colors.accent }}>✓</Text> : null}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={handleReset}
          >
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Xóa bộ lọc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.accent }]}
            onPress={handleClose}
          >
            <Text style={{ color: colors.card, fontWeight: '700', fontSize: 15 }}>Đóng</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  box: {
    borderRadius: 14,
    padding: 16,
    maxHeight: '85%',
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownValue: { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 8 },
  dropdownList: { maxHeight: 180, marginTop: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  optionText: { flex: 1, marginRight: 8, fontSize: 14 },
  resetBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
})
