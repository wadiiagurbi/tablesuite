import { Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth";
import NotFound from "./pages/NotFound";
import TenantLayout from "./layouts/TenantLayout";
import AdminLayout from "./layouts/AdminLayout";

const LandingPage = lazy(() => import("./pages/marketing/LandingPage"));
const Login = lazy(() => import("./pages/auth/Login"));
const SignUp = lazy(() => import("./pages/auth/SignUp"));
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));
const Home = lazy(() => import("./pages/Home"));
const Menu = lazy(() => import("./pages/Menu"));
const About = lazy(() => import("./pages/About"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Reservations = lazy(() => import("./pages/Reservations"));
const Contact = lazy(() => import("./pages/Contact"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const RestaurantSettings = lazy(() => import("./pages/admin/RestaurantSettings"));
const MenuManager = lazy(() => import("./pages/admin/MenuManager"));
const GalleryManager = lazy(() => import("./pages/admin/GalleryManager"));
const ReservationsInbox = lazy(() => import("./pages/admin/ReservationsInbox"));
const ContactInbox = lazy(() => import("./pages/admin/ContactInbox"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppLoading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="h-4 w-32 mx-auto rounded-full bg-dark/10 animate-pulse" />
        <p className="mt-4 text-sm font-medium text-dark/60">Loading the experience…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<AppLoading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="/site/:slug" element={<TenantLayout />}>
              <Route index element={<Home />} />
              <Route path="menu" element={<Menu />} />
              <Route path="about" element={<About />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="contact" element={<Contact />} />
              <Route path="*" element={<NotFound backTo="/" backLabel="Back to start" />} />
            </Route>

            <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="settings" element={<RestaurantSettings />} />
              <Route path="menu" element={<MenuManager />} />
              <Route path="gallery" element={<GalleryManager />} />
              <Route path="reservations" element={<ReservationsInbox />} />
              <Route path="messages" element={<ContactInbox />} />
              <Route path="*" element={<NotFound backTo="/admin" backLabel="Back to dashboard" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}
