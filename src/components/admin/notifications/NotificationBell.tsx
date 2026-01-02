'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/context/ToastContext'
import { useRouter } from '@/i18n/navigation'
import { useUser } from '@/context/UserContext'
import { createClient } from '@/utils/supabase/client'
import { getNotifications, getUnreadNotificationsCount, markAllNotificationsRead, markNotificationRead } from '@/actions/notifications'
import type { NotificationRow } from '@/types/notification'

function getActionUrl(n: any): string | null {
  const m = n?.metadata as any
  const url = m?.action_url
  return typeof url === 'string' && url.length ? url : null
}

export function NotificationBell() {
  const { user } = useUser()
  const { addToast } = useToast()
  const router = useRouter()

  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const userId = user?.id as string | undefined

  const load = async () => {
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.all([
        getNotifications({ scope: 'me', limit: 8 }),
        getUnreadNotificationsCount({ scope: 'me' }),
      ])

      if (listRes.ok) setItems(listRes.data as any)
      if (countRes.ok) setUnreadCount(countRes.data.count)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as any
          setUnreadCount((c) => c + (n?.is_read ? 0 : 1))
          setItems((prev) => [n, ...prev].slice(0, 8))
          const title = n?.title || 'New notification'
          addToast('info', title)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, addToast])

  const badgeText = useMemo(() => {
    if (!unreadCount) return null
    if (unreadCount > 99) return '99+'
    return String(unreadCount)
  }, [unreadCount])

  const handleOpenNotification = async (n: NotificationRow) => {
    try {
      if (!n.is_read) {
        await markNotificationRead(n.id)
        setUnreadCount((c) => Math.max(0, c - 1))
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      }
    } catch (e) {
      console.error(e)
    }

    const url = getActionUrl(n)
    if (url) router.push(url)
    else router.push('/admin/notifications')
  }

  const handleMarkAllRead = async () => {
    const res = await markAllNotificationsRead()
    if (res.ok) {
      setUnreadCount(0)
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
      addToast('success', 'All notifications marked as read')
    } else {
      addToast('error', res.error || 'Failed to mark all as read')
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => (open ? load() : null)}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='w-5 h-5' />
          {badgeText ? (
            <span className='absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] leading-[18px] rounded-full text-center'>
              {badgeText}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-[360px] p-2'>
        <div className='flex items-center justify-between px-2 py-1.5'>
          <DropdownMenuLabel className='p-0'>Notifications</DropdownMenuLabel>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              className='text-xs text-blue-600 hover:underline disabled:opacity-50'
              onClick={() => router.push('/admin/notifications')}
              disabled={loading}
            >
              View all
            </button>
            <button
              type='button'
              className='text-xs text-gray-600 hover:underline disabled:opacity-50'
              onClick={handleMarkAllRead}
              disabled={!unreadCount}
            >
              Mark all read
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className='px-3 py-6 text-sm text-gray-500 text-center'>
            {loading ? 'Loading…' : 'No notifications'}
          </div>
        ) : (
          <div className='max-h-[420px] overflow-y-auto'>
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className='items-start gap-3 py-2.5 cursor-pointer'
                onSelect={(e) => {
                  e.preventDefault()
                  handleOpenNotification(n)
                }}
              >
                <span
                  className={`mt-1 h-2 w-2 rounded-full ${
                    n.is_read ? 'bg-gray-300' : 'bg-blue-600'
                  }`}
                />
                <div className='flex-1'>
                  <div className={`text-sm ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                    {n.title || 'Notification'}
                  </div>
                  {n.content ? <div className='text-xs text-gray-500 mt-0.5 line-clamp-2'>{n.content}</div> : null}
                  <div className='text-[11px] text-gray-400 mt-1'>
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}






