import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { licensesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface License {
  id: string;
  title: string;
  description: string;
  licenseType: string;
  publisherId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export default function Dashboard() {
  const { user, publisher, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLicenses = async () => {
      if (!accessToken) {
        console.log('[Dashboard] No access token, skipping fetch');
        setIsLoading(false);
        return;
      }

      try {
        console.log('[Dashboard] Fetching licenses...');
        const data = await licensesApi.list<License[]>(accessToken);
        console.log('[Dashboard] Licenses received:', data);
        // Safety: ensure data is an array before setting
        setLicenses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[Dashboard] Error fetching licenses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch licenses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLicenses();
  }, [accessToken]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Please <a href="/login" className="text-blue-600 underline">login</a> to view your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>User Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>ID:</strong> {user?.id}</p>
            </CardContent>
          </Card>

          {publisher && (
            <Card>
              <CardHeader>
                <CardTitle>Publisher</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>Name:</strong> {publisher.name}</p>
                <p><strong>ID:</strong> {publisher.id}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading licenses...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : licenses.length === 0 ? (
              <p className="text-gray-500">No licenses found.</p>
            ) : (
              <div className="space-y-4">
                {licenses.map((license) => (
                  <div key={license.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold">{license.title}</h3>
                    <p className="text-sm text-gray-600">{license.description}</p>
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>Type: {license.licenseType}</span>
                      <span>Created: {new Date(license.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
