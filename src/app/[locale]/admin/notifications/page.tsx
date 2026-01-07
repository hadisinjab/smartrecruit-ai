'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card } from '@/components/ui/admin-card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/context/ToastContext'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/actions/notifications'
import type { NotificationRow, NotificationType } from '@/types/notification'

function getActionUrl(n: any): string | null {
  const m = n?.metadata as any
  const url = m?.action_url
  return typeof url === 'string' && url.length ? url : null
}

export default function NotificationsPage() {
  const t = useTranslations('Notifications')
  const { addToast } = useToast()
  const router = useRouter()

  const TYPES: Array<{ value: 'all' | NotificationType; label: string }> = [
    { value: 'all', label: t('filterAll') },
    { value: 'new_application', label: t('types.new_application') },
    { value: 'application_completed', label: t('types.application_completed') },
    { value: 'incomplete_application', label: t('types.incomplete_application') },
    { value: 'duplicate_application', label: t('types.duplicate_application') },
    { value: 'job_created', label: t('types.job_created') },
    { value: 'job_updated', label: t('types.job_updated') },
    { value: 'ai_evaluation_ready', label: t('types.ai_evaluation_ready') },
    { value: 'interview_scheduled', label: t('types.interview_scheduled') },
    { value: 'interview_uploaded', label: t('types.interview_uploaded') },
    { value: 'interview_analysis_ready', label: t('types.interview_analysis_ready') },
    { value: 'assignment_submitted', label: t('types.assignment_submitted') },
    { value: 'status_changed', label: t('types.status_changed') },
    { value: 'reminder', label: t('types.reminder') },
  ]

  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<'all' | NotificationType>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const filteredType = useMemo(() => (type === 'all' ? undefined : type), [type])

  const load = async () => {
    setLoading(true)
    try {
      const res = await getNotifications({
        scope: 'me',
        type: filteredType,
        unreadOnly,
        limit: 100,
      })
      if (res.ok) setItems(res.data as any)
      else addToast('error', res.error || 'Failed to load notifications')
    } catch (e) {
      console.error(e)
      addToast('error', 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, unreadOnly])

  const markAll = async () => {
    const res = await markAllNotificationsRead()
    if (res.ok) {
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
      addToast('success', 'All notifications marked as read')
    } else {
      addToast('error', res.error || 'Failed to mark all as read')
    }
  }

  const openOne = async (n: NotificationRow) => {
    if (!n.is_read) {
      const res = await markNotificationRead(n.id)
      if (res.ok) setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }

    const url = getActionUrl(n)
    if (url) router.push(url)
  }

  return (
    <AdminLayout title='Notifications' subtitle='Stay updated with what matters'>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='min-w-[220px]'>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder='Filter by type' />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant={unreadOnly ? 'default' : 'outline'} onClick={() => setUnreadOnly((v) => !v)}>
            {unreadOnly ? t('showUnreadOnly') : t('showUnreadOnly')}
          </Button>

          <Button variant='outline' onClick={markAll} disabled={!items.some((x) => !x.is_read)}>
            {t('markAllAsRead')}
          </Button>
        </div>

        <Card className='p-0 overflow-hidden'>
          <div className='divide-y'>
            {loading ? (
              <div className='p-6 text-sm text-gray-500'>{t('loading')}</div>
            ) : items.length === 0 ? (
              <div className='p-6 text-sm text-gray-500'>{t('empty')}</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type='button'
                  onClick={() => openOne(n)}
                  className='w-full text-left p-4 hover:bg-gray-50 transition-colors'
                >
                  <div className='flex items-start gap-3'>
                    <span className={`mt-1 h-2 w-2 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-blue-600'}`} />
                    <div className='flex-1'>
                      <div className={`text-sm ${n.is_read ? 'text-gray-800' : 'text-gray-900 font-semibold'}`}>
                        {n.title || 'Notification'}
                      </div>
                      {n.content ? <div className='text-sm text-gray-600 mt-0.5'>{n.content}</div> : null}
                      <div className='text-xs text-gray-400 mt-2'>
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}






