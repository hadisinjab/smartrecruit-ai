'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle, XCircle, Server, Database, Globe } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function DiagnosticsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [envInfo, setEnvInfo] = useState<any>(null);

  useEffect(() => {
    // Collect client-side env info
    setEnvInfo({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '(not set)',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)',
    });
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const checks: any = {
      backend: { status: 'pending', message: 'Checking...' },
      supabase: { status: 'pending', message: 'Checking...' },
      ai_server: { status: 'pending', message: 'Checking...' } // Indirect check
    };
    setResults({ ...checks });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
    
    // 1. Check Backend Connection
    try {
      const t0 = performance.now();
      const res = await fetch(`${apiUrl}/api/health`);
      const t1 = performance.now();
      const data = await res.json();
      
      checks.backend = {
        status: res.ok ? 'success' : 'error',
        message: res.ok ? `Connected (${Math.round(t1 - t0)}ms)` : `Error: ${res.status}`,
        details: data
      };
    } catch (e: any) {
      checks.backend = {
        status: 'error',
        message: `Connection Failed: ${e.message}`,
        details: { error: e.message }
      };
    }

    // 2. Check Supabase Connection (Client-side)
    try {
      const supabase = createClient();
      const t0 = performance.now();
      const { data, error } = await supabase.from('users').select('count').limit(1).single();
      const t1 = performance.now();

      if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows", which means connection worked
         throw error;
      }
      
      checks.supabase = {
        status: 'success',
        message: `Connected (${Math.round(t1 - t0)}ms)`,
        details: { data }
      };
    } catch (e: any) {
      checks.supabase = {
        status: 'error',
        message: `Connection Failed: ${e.message}`,
        details: e
      };
    }

    setResults({ ...checks });
    setLoading(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />;
    return <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />;
  };

  return (
    <AdminLayout
      title="System Diagnostics"
      subtitle="Check connection status and environment configuration"
    >
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Environment Configuration</h2>
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? 'Running Tests...' : 'Run Diagnostics'}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="text-xs text-gray-500 uppercase font-bold">Frontend API URL</label>
              <div className="mt-1 font-mono text-sm break-all">
                {envInfo?.NEXT_PUBLIC_API_URL}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="text-xs text-gray-500 uppercase font-bold">Supabase URL</label>
              <div className="mt-1 font-mono text-sm break-all">
                {envInfo?.NEXT_PUBLIC_SUPABASE_URL}
              </div>
            </div>
          </div>
        </Card>

        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backend Status */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-6 h-6 text-blue-500" />
                <h3 className="font-semibold">Backend Service</h3>
                <div className="ml-auto">
                  <StatusIcon status={results.backend.status} />
                </div>
              </div>
              <p className={`text-sm mb-4 ${
                results.backend.status === 'success' ? 'text-green-600' : 
                results.backend.status === 'error' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {results.backend.message}
              </p>
              {results.backend.details && (
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(results.backend.details, null, 2)}
                </pre>
              )}
            </Card>

            {/* Supabase Status */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-green-500" />
                <h3 className="font-semibold">Supabase Database</h3>
                <div className="ml-auto">
                  <StatusIcon status={results.supabase.status} />
                </div>
              </div>
              <p className={`text-sm mb-4 ${
                results.supabase.status === 'success' ? 'text-green-600' : 
                results.supabase.status === 'error' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {results.supabase.message}
              </p>
              {results.supabase.details && (
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(results.supabase.details, null, 2)}
                </pre>
              )}
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}