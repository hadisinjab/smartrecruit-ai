'use client';

import React, { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { DataTable } from '@/components/admin/DataTable';
import { Column } from '@/components/admin/DataTable';
import { mockEvaluations, getCandidateById } from '@/data/mockData';
import { Evaluation } from '@/types/admin';
import { Plus, Search, Star, MessageSquare, User, Calendar } from 'lucide-react';

export default function EvaluationsPage() {
  const t = useTranslations('Evaluations');
  const tTable = useTranslations('Table');
  const tCommon = useTranslations('Common');
  const format = useFormatter();

  const [evaluations] = useState<Evaluation[]>(mockEvaluations);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvaluations = evaluations.filter(evaluation => {
    const candidate = getCandidateById(evaluation.candidateId);
    if (!candidate) return false;
    
    return (
      candidate.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.evaluatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getRecommendationColor = (recommendation: string) => {
    const colors = {
      'strong-hire': 'bg-green-100 text-green-800',
      'hire': 'bg-blue-100 text-blue-800',
      'no-hire': 'bg-yellow-100 text-yellow-800',
      'strong-no-hire': 'bg-red-100 text-red-800'
    };
    return colors[recommendation as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      technical: 'bg-blue-100 text-blue-800',
      behavioral: 'bg-purple-100 text-purple-800',
      cultural: 'bg-green-100 text-green-800',
      final: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const evaluationColumns: Column<Evaluation>[] = [
    {
      key: 'candidate',
      title: tTable('candidate'),
      render: (_, record) => {
        const candidate = getCandidateById(record.candidateId);
        if (!candidate) return <span className='text-gray-500'>Unknown</span>;
        
        return (
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center'>
              <span className='text-white text-xs font-medium'>
                {candidate.firstName[0]}{candidate.lastName[0]}
              </span>
            </div>
            <div>
              <p className='font-medium text-gray-900'>
                {candidate.firstName} {candidate.lastName}
              </p>
              <p className='text-sm text-gray-500'>{candidate.position}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'type',
      title: tTable('type'),
      render: (type) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(type)}`}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
      )
    },
    {
      key: 'scores',
      title: tTable('overallScore'),
      render: (scores) => (
        <div className='flex items-center space-x-1'>
          <Star className='w-4 h-4 text-yellow-400 fill-current' />
          <span className='font-medium text-gray-900'>{scores.overall}/5</span>
        </div>
      )
    },
    {
      key: 'evaluatorName',
      title: tTable('evaluator'),
      render: (name) => (
        <div className='flex items-center space-x-2'>
          <User className='w-4 h-4 text-gray-400' />
          <span className='text-sm text-gray-700'>{name}</span>
        </div>
      )
    },
    {
      key: 'recommendation',
      title: tTable('recommendation'),
      render: (recommendation) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRecommendationColor(recommendation)}`}>
          {recommendation.replace('-', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: tTable('date'),
      render: (date) => (
        <div className='flex items-center space-x-1'>
          <Calendar className='w-4 h-4 text-gray-400' />
          <span className='text-sm text-gray-700'>{new Date(date).toLocaleDateString()}</span>
        </div>
      ),
      sortable: true
    }
  ];

  // Calculate stats
  const stats = {
    totalEvaluations: evaluations.length,
    thisWeek: evaluations.filter(e => {
      const evaluationDate = new Date(e.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return evaluationDate >= weekAgo;
    }).length,
    averageScore: (evaluations.reduce((sum, e) => sum + e.scores.overall, 0) / evaluations.length).toFixed(1),
    hireRecommendations: evaluations.filter(e => e.recommendation === 'hire' || e.recommendation === 'strong-hire').length
  };

  return (
    <AdminLayout
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <div className='flex space-x-3'>
          <Button variant='outline'>
            {t('exportReport')}
          </Button>
          <Button className='flex items-center space-x-2'>
            <Plus className='w-4 h-4' />
            <span>{t('newEvaluation')}</span>
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Search and Stats */}
        <div className='flex items-center justify-between'>
          <div className='relative flex-1 max-w-md'>
            <Search className='w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          <div className='text-sm text-gray-600'>
            {t('count', { count: filteredEvaluations.length, total: evaluations.length })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-blue-600'>{stats.totalEvaluations}</p>
              <p className='text-sm text-gray-600'>{t('stats.total')}</p>
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
              <p className='text-2xl font-bold text-purple-600'>{stats.averageScore}</p>
              <p className='text-sm text-gray-600'>{t('stats.avgScore')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-yellow-600'>{stats.hireRecommendations}</p>
              <p className='text-sm text-gray-600'>{t('stats.hireRecs')}</p>
            </div>
          </Card>
        </div>

        {/* Evaluations Table */}
        <DataTable
          data={filteredEvaluations}
          columns={evaluationColumns}
          emptyText={t('empty')}
        />

        {/* Evaluation Details */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Recent High Scores */}
          <Card className='p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('recentHighScores')}</h2>
            <div className='space-y-3'>
              {evaluations
                .filter(e => e.scores.overall >= 4)
                .slice(0, 5)
                .map((evaluation) => {
                  const candidate = getCandidateById(evaluation.candidateId);
                  if (!candidate) return null;
                  
                  return (
                    <div key={evaluation.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                      <div className='flex items-center space-x-3'>
                        <div className='w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center'>
                          <span className='text-white text-xs font-medium'>
                            {candidate.firstName[0]}{candidate.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className='font-medium text-gray-900'>
                            {candidate.firstName} {candidate.lastName}
                          </p>
                          <p className='text-sm text-gray-500'>{evaluation.type} {t('interview')}</p>
                        </div>
                      </div>
                      <div className='flex items-center space-x-1'>
                        <Star className='w-4 h-4 text-yellow-400 fill-current' />
                        <span className='font-medium text-gray-900'>{evaluation.scores.overall}/5</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* Action Items */}
          <Card className='p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('actionItems')}</h2>
            <div className='space-y-3'>
              <div className='p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                <div className='flex items-start space-x-3'>
                  <MessageSquare className='w-5 h-5 text-yellow-600 mt-0.5' />
                  <div>
                    <p className='font-medium text-yellow-800'>{t('actions.pending')}</p>
                    <p className='text-sm text-yellow-700'>{t('actions.pendingDesc', { count: 3 })}</p>
                  </div>
                </div>
              </div>
              
              <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                <div className='flex items-start space-x-3'>
                  <User className='w-5 h-5 text-blue-600 mt-0.5' />
                  <div>
                    <p className='font-medium text-blue-800'>{t('actions.missing')}</p>
                    <p className='text-sm text-blue-700'>{t('actions.missingDesc', { count: 2 })}</p>
                  </div>
                </div>
              </div>
              
              <div className='p-3 bg-green-50 border border-green-200 rounded-lg'>
                <div className='flex items-start space-x-3'>
                  <Star className='w-5 h-5 text-green-600 mt-0.5' />
                  <div>
                    <p className='font-medium text-green-800'>{t('actions.strong')}</p>
                    <p className='text-sm text-green-700'>{t('actions.strongDesc', { count: 4 })}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
