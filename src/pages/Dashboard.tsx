import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState([]);
  const [publisher, setPublisher] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // 1. Get the Publisher profile first
        const { data: pubData, error: pubError } = await supabase
          .from("publishers")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (pubError) throw pubError;
        setPublisher(pubData);

        // 2. Get licenses linked to that Publisher
        const { data: licData, error: licError } = await supabase
          .from("licenses")
          .select("*")
          .eq("publisher_id", pubData.id);

        if (licError) throw licError;
        setLicenses(licData || []);
      } catch (err) {
        console.error("[Dashboard] Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B0D17] text-white">
      <Header />
      <main className="max-w-6xl mx-auto pt-32 pb-12 px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold">Console</h1>
            {publisher && <p className="text-blue-400 mt-1">Publisher: {publisher.name}</p>}
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-10">
          <Card className="bg-[#161B22] border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400 uppercase">Account Email</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-medium">{user.email}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400 uppercase">Total Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-medium">{licenses.length}</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-semibold mb-6">Active Licenses</h2>
        {isLoading ? (
          <p className="text-gray-500">Syncing with database...</p>
        ) : licenses.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
            <p className="text-gray-500">No licenses found for this publisher.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {licenses.map((lic) => (
              <Card
                key={lic.id}
                className="bg-[#161B22] border-white/10 text-white hover:border-blue-500/50 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{lic.title}</h3>
                    <span className="text-[10px] uppercase bg-blue-500/10 text-blue-400 px-2 py-1 rounded">
                      {lic.license_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{lic.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
