import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface License {
  id: string;
  title: string;
  description: string;
  license_type: string;
  publisher_id: string;
  source_url: string | null;
  source_id: string | null;
  metadata: {
    human_price?: number;
    ai_price?: number;
    pub_date?: string;
    source_name?: string;
    auto_imported?: boolean;
  } | null;
  created_at: string;
}

export default function Dashboard() {
  const { user, publisher, logout } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch licenses from Supabase
  const fetchLicenses = async () => {
    if (!publisher?.id) {
      console.log('[Dashboard] No publisher, skipping fetch');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[Dashboard] Fetching licenses for publisher:', publisher.id);

      const { data, error: fetchError } = await supabase
        .from('licenses')
        .select('*')
        .eq('publisher_id', publisher.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error('[Dashboard] Fetch error:', fetchError.message);
        throw new Error(fetchError.message);
      }

      console.log('[Dashboard] Licenses received:', data?.length || 0);
      setLicenses(data || []);
      setError(null);
    } catch (err) {
      console.error('[Dashboard] Error fetching licenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch licenses');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLicenses();
  }, [publisher?.id]);

  // Realtime subscription for auto-updates
  useEffect(() => {
    if (!publisher?.id) return;

    console.log('[Dashboard] Setting up realtime subscription for publisher:', publisher.id);

    const channel = supabase
      .channel('licenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'licenses',
          filter: `publisher_id=eq.${publisher.id}`,
        },
        (payload) => {
          console.log('[Dashboard] Realtime event:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            // Add new license to the top
            const newLicense = payload.new as License;
            setLicenses((prev) => [newLicense, ...prev].slice(0, 10));
          } else if (payload.eventType === 'UPDATE') {
            // Update existing license
            const updatedLicense = payload.new as License;
            setLicenses((prev) =>
              prev.map((l) => (l.id === updatedLicense.id ? updatedLicense : l))
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted license
            const deletedId = payload.old?.id;
            if (deletedId) {
              setLicenses((prev) => prev.filter((l) => l.id !== deletedId));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Dashboard] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[Dashboard] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [publisher?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLicenses();
  };

  // Format price for display
  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || price === null) return '$0.00';
    return `$${price.toFixed(2)}`;
  };

  // Truncate URL for display
  const truncateUrl = (url: string | null, maxLength = 40): string => {
    if (!url) return '-';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>
              Please{' '}
              <a href="/login" className="text-blue-600 underline">
                login
              </a>{' '}
              to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>User Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>ID:</strong> {user?.id}
              </p>
            </CardContent>
          </Card>

          {publisher && (
            <Card>
              <CardHeader>
                <CardTitle>Publisher</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  <strong>Name:</strong> {publisher.name}
                </p>
                <p>
                  <strong>ID:</strong> {publisher.id}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest Assets</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading assets...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : licenses.length === 0 ? (
              <p className="text-gray-500">No assets found. Add an RSS feed to start importing content.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Name</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead className="text-right">Human Price</TableHead>
                      <TableHead className="text-right">AI Price</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell className="font-medium">
                          <div className="max-w-[250px] truncate" title={license.title}>
                            {license.title}
                          </div>
                          {license.metadata?.auto_imported && (
                            <span className="text-xs text-blue-500 ml-1">(auto)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {license.source_url ? (
                            <a
                              href={license.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                              title={license.source_url}
                            >
                              {truncateUrl(license.source_url)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(license.metadata?.human_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(license.metadata?.ai_price)}
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{license.license_type}</span>
                        </TableCell>
                        <TableCell>
                          {new Date(license.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
