import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'

const PRESENCE_CHANNEL_PREFIX = 'presence:warehouse-online'

function syncOnlineUserIds(channel: RealtimeChannel) {
  const state = channel.presenceState()
  const ids = new Set(Object.keys(state))
  useAuthStore.getState().setOnlineUserIds(ids)
}

export function joinPresenceChannel(userId: string, email: string): RealtimeChannel {
  const channel = supabase.channel(`${PRESENCE_CHANNEL_PREFIX}-${Date.now()}`, {
    config: {
      private: true,
      presence: { key: userId },
    },
  })

  channel
    .on('presence', { event: 'sync' }, () => syncOnlineUserIds(channel))
    .on('presence', { event: 'join' }, () => syncOnlineUserIds(channel))
    .on('presence', { event: 'leave' }, () => syncOnlineUserIds(channel))

  void channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: userId,
        email,
        joined_at: new Date().toISOString(),
      })
      syncOnlineUserIds(channel)
    }
  })

  return channel
}

export async function leavePresenceChannel(channel: RealtimeChannel | null) {
  if (!channel) return
  try {
    await channel.untrack()
  } catch {
    // channel may already be closed
  }
  await supabase.removeChannel(channel)
  useAuthStore.getState().setOnlineUserIds(new Set())
}
