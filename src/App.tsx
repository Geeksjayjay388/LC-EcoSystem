import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen";
import { supabase } from "./lib/supabase";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import Share from "./pages/Share";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingScreen message="Connecting to Lanet Computers Eco-System..." />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/share" element={<Share />} />
        <Route
          path="/"
          element={session ? <Navigate to="/home" replace /> : <LoginPage />}
        />
        <Route
          path="/home"
          element={session ? <Home session={session} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to={session ? "/home" : "/"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
