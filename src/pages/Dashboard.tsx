import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";

// SOLID FOUNDATION: Define your data structure locally first
const MOCK_LICENSES = [
  {
    id: "1",
    title: "Cyberpunk Asset Pack",
    description: "High-quality 3D assets for urban environments.",
    license_type: "exclusive",
  },
  {
    id: "2",
    title: "Ambient Soundscape Collection",
    description: "Procedural audio tracks for game developers.",
    license_type: "standard",
  },
];

export default function Dashboard() {
  const { user, logout } = useAuth(); // Real Auth connection
  const navigate = useNavigate();

  // If the user isn't logged in, redirect them properly
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center p-4">
        <Button onClick={() => navigate("/login")}>Please Login to Access Console</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D17] text-white">
      <Header />

      <main className="max-w-6xl mx-auto pt-32 pb-12 px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Console</h1>
            <p className="text-blue-400 mt-1">Manage your digital assets and licenses</p>
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
              <CardTitle className="text-sm text-gray-400 uppercase">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-medium truncate">{user.email}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400 uppercase">Total Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-medium">{MOCK_LICENSES.length}</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-semibold mb-6">Your Registered Content</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_LICENSES.map((lic) => (
            <Card
              key={lic.id}
              className="bg-[#161B22] border-white/10 text-white hover:border-blue-500/50 cursor-pointer transition-all"
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
      </main>
    </div>
  );
}
