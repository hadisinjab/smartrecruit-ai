'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getActivityLogs } from '@/actions/activity';
import { ActivityLogEntry } from '@/types/admin';
import { useToast } from '@/context/ToastContext';
import {
  Search,
  Download,
  User,
  Briefcase,
  FileText,
  Settings,
  Shield,
  Eye,
  Monitor
} from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import type { Column } from '@/components/admin/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function formatMetaValue(value: any): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length ? `${value.length} items` : '—'
  if (typeof value === 'object') return 'Object'
  return String(value)
}

function getMetaSummary(meta: any): Array<{ k: string; v: string }> {
  if (!meta || typeof meta !== 'object') return []
  const entries = Object.entries(meta).filter(([k, v]) => v != null && v !== '' && k !== 'description')
  const preferred = ['updatedFields', 'is_active', 'role', 'status', 'previous_status', 'decision', 'score', 'email', 'fullName', 'organizationName']
  const sorted = entries.sort(([a], [b]) => {
    const ai = preferred.indexOf(a)
    const bi = preferred.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return sorted.slice(0, 3).map(([k, v]) => ({
    k,
    v: Array.isArray(v) ? (v.length ? v.join(', ') : '—') : formatMetaValue(v),
  }))
}

function buildInlineMetaText(meta: any): string {
  if (!meta || typeof meta !== 'object') return ''
  const pairs: Array<[string, any]> = []
  const pick = (k: string) => {
    if (meta[k] != null && meta[k] !== '') pairs.push([k, meta[k]])
  }
  ;['decision', 'score', 'status', 'previous_status', 'role', 'is_active', 'updatedFields', 'title', 'email', 'fullName'].forEach(pick)
  if (!pairs.length) return ''

  return pairs
    .slice(0, 4)
    .map(([k, v]) => {
      const vv = Array.isArray(v) ? (v.length ? v.join(', ') : '—') : formatMetaValue(v)
      return `${k}: ${vv}`
    })
    .join(' • ')
}

const MetadataCell: React.FC<{ meta: any; t: any }> = ({ meta, t }) => {
  const keyLabels: Record<string, string> = {
    decision: t('metadata.labels.decision'),
    score: t('metadata.labels.score'),
    status: t('metadata.labels.status'),
    previous_status: t('metadata.labels.previous_status'),
    role: t('metadata.labels.role'),
    is_active: t('metadata.labels.is_active'),
    updatedFields: t('metadata.labels.updatedFields'),
    title: t('metadata.labels.title'),
    email: t('metadata.labels.email'),
    fullName: t('metadata.labels.fullName'),
  }

  const summary = getMetaSummary(meta)
  const hasData = meta && typeof meta === 'object' && Object.keys(meta).length > 0

  if (!hasData) {
    return <span className='text-xs text-gray-500'>—</span>
  }

  return (
    <div className='flex items-center gap-2'>
      <div className='flex flex-wrap gap-1 max-w-[220px]'>
        {summary.length ? (
          summary.map((item) => (
            <span
              key={item.k}
              className='inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[11px]'
              title={`${item.k}: ${item.v}`}
            >
              <span className='font-medium'>{item.k}</span>
              <span className='mx-1 text-gray-400'>·</span>
              <span className='truncate max-w-[140px]'>{item.v}</span>
            </span>
          ))
        ) : (
          <span className='text-xs text-gray-500'>{t('metadata.none')}</span>
        )}
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' title={t('metadata.view')}>
            <Eye className='w-4 h-4' />
          </Button>
        </DialogTrigger>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{t('metadata.detailsTitle')}</DialogTitle>
            <DialogDescription>{t('metadata.detailsDesc')}</DialogDescription>
          </DialogHeader>

          <div className='max-h-[60vh] overflow-auto border rounded-lg'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 border-b'>
                <tr>
                  <th className='text-start px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    {t('metadata.key')}
                  </th>
                  <th className='text-start px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    {t('metadata.value')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(meta || {}).map(([k, v]) => (
                  <tr key={k} className='border-b last:border-b-0'>
                    <td className='px-4 py-2 font-mono text-xs text-gray-700 align-top whitespace-nowrap'>
                      {keyLabels[k] || k}
                    </td>
                    <td className='px-4 py-2 text-gray-900 align-top'>
                      {Array.isArray(v) ? (
                        v.length ? (
                          <ul className='list-disc list-inside space-y-1'>
                            {v.slice(0, 20).map((x, i) => (
                              <li key={i}>{typeof x === 'string' ? x : formatMetaValue(x)}</li>
                            ))}
                            {v.length > 20 && <li>…</li>}
                          </ul>
                        ) : (
                          '—'
                        )
                      ) : typeof v === 'object' && v != null ? (
                        <pre className='text-xs bg-gray-50 border rounded p-2 overflow-auto'>
                          {JSON.stringify(v, null, 2)}
                        </pre>
                      ) : (
                        <span>{formatMetaValue(v)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ActivityLogPage() {
  const t = useTranslations('Activity');
  const tTable = useTranslations('Table');
  const tCommon = useTranslations('Common');
  const tTarget = useTranslations('Target');

  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadActivities() {
      try {
        const data = await getActivityLogs();
        if (isMounted) {
          setActivityLog(data);
        }
      } catch (error) {
        console.error('Failed to load activity logs:', error);
        if (isMounted) {
          addToast('error', 'Failed to load activity logs');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadActivities();
    return () => {
      isMounted = false;
    };
  }, [addToast]);

  // Get unique values for filters
  const getUniqueUsers = () => {
    const users = [...new Set(activityLog.map(entry => `${entry.userName} (${entry.userRole})`))];
    return users;
  };

  // Filter activities based on search and filters
  const filteredActivities = activityLog.filter(entry => {
    const matchesSearch = 
      entry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = userFilter === 'all' || 
      entry.userName.toLowerCase().includes(userFilter.toLowerCase()) ||
      entry.userRole.toLowerCase().includes(userFilter.toLowerCase());
    
    // Date filtering
    const entryDate = new Date(entry.timestamp);
    let matchesDate = true;
    if (dateFilter === 'today') {
      const today = new Date();
      matchesDate = entryDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = entryDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = entryDate >= monthAgo;
    }
    
    return matchesSearch && matchesUser && matchesDate;
  });

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'candidate':
        return <User className="w-4 h-4" />;
      case 'job':
        return <Briefcase className="w-4 h-4" />;
      case 'evaluation':
        return <FileText className="w-4 h-4" />;
      case 'user':
        return <Shield className="w-4 h-4" />;
      case 'system':
        return <Settings className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getTargetTypeColor = (type: string) => {
    switch (type) {
      case 'candidate':
        return 'bg-blue-100 text-blue-800';
      case 'job':
        return 'bg-green-100 text-green-800';
      case 'evaluation':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-orange-100 text-orange-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'text-green-600';
      case 'updated':
        return 'text-blue-600';
      case 'deleted':
        return 'text-red-600';
      case 'activated':
        return 'text-green-600';
      case 'deactivated':
        return 'text-red-600';
      case 'exported':
        return 'text-purple-600';
      case 'reviewed':
        return 'text-blue-600';
      case 'submitted':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'reviewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const columns: Column<ActivityLogEntry>[] = [
    {
      key: 'user',
      title: tTable('user'),
      render: (_, record) => (
        <div className='flex items-center space-x-3'>
          <div className='w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center'>
            <span className='text-white text-xs font-medium'>
              {record.userName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className='font-medium text-gray-900 text-sm'>{record.userName}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(record.userRole)}`}>
              {record.userRole.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'action',
      title: tTable('action'),
      render: (_, record) => (
        <div className='space-y-1'>
          <p className={`font-medium text-sm ${getActionColor(record.action)}`}>
            {record.action}
          </p>
          <div className='flex items-center space-x-2'>
            {getTargetTypeIcon(record.targetType)}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTargetTypeColor(record.targetType)}`}>
              {tTarget(record.targetType)}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'target',
      title: tTable('target'),
      render: (_, record) => (
        <div>
          <p className='font-medium text-gray-900 text-sm'>{record.target}</p>
          {(() => {
            const metaText = buildInlineMetaText(record.metadata)
            const desc = record.description
            const line = metaText || desc
            return line ? <p className='text-xs text-gray-500 mt-1'>{line}</p> : null
          })()}
        </div>
      )
    },
    {
      key: 'entity',
      title: tTable('entity'),
      render: (_, record) => (
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTargetTypeColor(record.targetType)}`}>
              {tTarget(record.targetType)}
            </span>
          </div>

          <div className='text-xs text-gray-700 space-y-1'>
            {record.entityId ? (
              <div className='truncate max-w-[260px]' title={record.entityId}>
                <span className='font-medium text-gray-500'>{t('entityFields.entityId')}:</span>{' '}
                <span className='font-mono'>{record.entityId}</span>
              </div>
            ) : null}
            {record.jobFormId ? (
              <div className='truncate max-w-[260px]' title={record.jobFormId}>
                <span className='font-medium text-gray-500'>{t('entityFields.jobFormId')}:</span>{' '}
                <span className='font-mono'>{record.jobFormId}</span>
              </div>
            ) : null}
            {record.applicationId ? (
              <div className='truncate max-w-[260px]' title={record.applicationId}>
                <span className='font-medium text-gray-500'>{t('entityFields.applicationId')}:</span>{' '}
                <span className='font-mono'>{record.applicationId}</span>
              </div>
            ) : null}
            {!record.entityId && !record.jobFormId && !record.applicationId ? (
              <div className='text-gray-500'>—</div>
            ) : null}
          </div>
        </div>
      )
    },
    {
      key: 'metadata',
      title: tTable('metadata'),
      render: (_, record) => <MetadataCell meta={record.metadata} t={t} />
    },
    {
      key: 'timestamp',
      title: tTable('timestamp'),
      render: (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        let timeText = '';
        if (diffInHours < 1) {
          const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
          timeText = t('time.minutesAgo', { count: diffInMinutes });
        } else if (diffInHours < 24) {
          timeText = t('time.hoursAgo', { count: diffInHours });
        } else {
          const diffInDays = Math.floor(diffInHours / 24);
          timeText = t('time.daysAgo', { count: diffInDays });
        }
        
        return (
          <div className='text-sm'>
            <div className='font-medium text-gray-900'>{timeText}</div>
            <div className='text-xs text-gray-500'>
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      }
    },
  ];

  const stats = {
    total: activityLog.length,
    today: activityLog.filter(entry => {
      const today = new Date();
      return new Date(entry.timestamp).toDateString() === today.toDateString();
    }).length,
    thisWeek: activityLog.filter(entry => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(entry.timestamp) >= weekAgo;
    }).length,
    uniqueUsers: new Set(activityLog.map(entry => entry.userId)).size
  };

  // Recent actions summary removed (not needed in this view).

  if (loading) {
    return (
      <AdminLayout title={t('title')} subtitle={t('subtitle')}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p>{tCommon('loading') || 'Loading...'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={t('title')}
      subtitle={t('count', { count: filteredActivities.length })}
      actions={
        <Button className='flex items-center space-x-2'>
          <Download className='w-4 h-4' />
          <span>{t('exportLog')}</span>
        </Button>
      }
    >
      <div className='space-y-6'>
        {/* Stats */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-gray-900'>{stats.total}</p>
              <p className='text-sm text-gray-600'>{t('stats.total')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-blue-600'>{stats.today}</p>
              <p className='text-sm text-gray-600'>{t('stats.today')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>{stats.thisWeek}</p>
              <p className='text-sm text-gray-600'>{t('stats.thisWeek')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-purple-600'>{stats.uniqueUsers}</p>
              <p className='text-sm text-gray-600'>{t('stats.activeUsers')}</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className='p-6'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
            
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue placeholder={t('filters.user')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allUsers')}</SelectItem>
                {getUniqueUsers().map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className='w-full sm:w-[150px]'>
                <SelectValue placeholder={t('filters.date')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allTime')}</SelectItem>
                <SelectItem value="today">{t('filters.today')}</SelectItem>
                <SelectItem value="week">{t('filters.week')}</SelectItem>
                <SelectItem value="month">{t('filters.month')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Activity Log Table */}
        <Card className='p-6'>
          <DataTable
            data={filteredActivities}
            columns={columns}
            emptyText={t('empty')}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
