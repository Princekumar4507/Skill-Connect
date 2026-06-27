import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import UserProfilePage from "./pages/UserProfilePage";
import DiscoverPage from "./pages/DiscoverPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import MessagesPage from "./pages/MessagesPage";
import EventsPage from "./pages/EventsPage";
import CommunitiesPage from "./pages/CommunitiesPage";
import CommunityDetailPage from "./pages/CommunityDetailPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import HelpCenterPage from "./pages/HelpCenterPage";
import CommunityGuidelinesPage from "./pages/CommunityGuidelinesPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import ContactPage from "./pages/ContactPage";
import FeedbackPage from "./pages/FeedbackPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import StudyGroupsPage from "./pages/StudyGroupsPage";
import StudyGroupDetailPage from "./pages/StudyGroupDetailPage";
import ResourcesPage from "./pages/ResourcesPage";
import MarketplacePage from "./pages/MarketplacePage";
import LostFoundPage from "./pages/LostFoundPage";
import PostDetailPage from "./pages/PostDetailPage";
import SavedPostsPage from "./pages/SavedPostsPage";
import ScrollToTop from "./components/ScrollToTop";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEventsPage from "./pages/admin/AdminEventsPage";
import AdminCommunitiesPage from "./pages/admin/AdminCommunitiesPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminRolesPage from "./pages/admin/AdminRolesPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <PWAInstallPrompt />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
              <Route path="/communities" element={<ProtectedRoute><CommunitiesPage /></ProtectedRoute>} />
              <Route path="/community/:id" element={<ProtectedRoute><CommunityDetailPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/user/:userId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
              <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
              <Route path="/study-groups" element={<ProtectedRoute><StudyGroupsPage /></ProtectedRoute>} />
              <Route path="/study-group/:id" element={<ProtectedRoute><StudyGroupDetailPage /></ProtectedRoute>} />
              <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
              <Route path="/lost-found" element={<ProtectedRoute><LostFoundPage /></ProtectedRoute>} />
              <Route path="/post/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
              <Route path="/saved-posts" element={<ProtectedRoute><SavedPostsPage /></ProtectedRoute>} />
              <Route path="/help-center" element={<HelpCenterPage />} />
              <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-service" element={<TermsOfServicePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/report-issue" element={<ReportIssuePage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/events" element={<AdminEventsPage />} />
              <Route path="/admin/communities" element={<AdminCommunitiesPage />} />
              <Route path="/admin/content" element={<AdminContentPage />} />
              <Route path="/admin/roles" element={<AdminRolesPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
