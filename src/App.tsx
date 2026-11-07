import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/features/shell/AppShell';
import { NotFound } from '@/features/shell/NotFound';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RedirectIfAuthed, RequireAuth, RequireConfig } from '@/features/auth/guards';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UpdateToast } from '@/features/shell/UpdateToast';


// Lazy routes keep the signed-in app shell small (PRD: initial JS under 200KB).
const ComponentGallery = lazy(() => import('@/features/dev/ComponentGallery'));
const Start = lazy(() => import('@/features/onboarding/Start').then((m) => ({ default: m.Start })));
const SignUp = lazy(() => import('@/features/auth/SignUp').then((m) => ({ default: m.SignUp })));
const LogIn = lazy(() => import('@/features/auth/LogIn').then((m) => ({ default: m.LogIn })));
const ForgotPassword = lazy(() => import('@/features/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('@/features/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const VerifyEmail = lazy(() => import('@/features/auth/VerifyEmail').then((m) => ({ default: m.VerifyEmail })));
const AuthConfirm = lazy(() => import('@/features/auth/AuthConfirm').then((m) => ({ default: m.AuthConfirm })));
const HomePage = lazy(() => import('@/features/lists/HomePage').then((m) => ({ default: m.HomePage })));
const ListsPage = lazy(() => import('@/features/lists/ListsPage').then((m) => ({ default: m.ListsPage })));
const NewListRoute = lazy(() => import('@/features/lists/NewListRoute').then((m) => ({ default: m.NewListRoute })));
const ShoppingMode = lazy(() => import('@/features/shopping/ShoppingMode').then((m) => ({ default: m.ShoppingMode })));
const SharedPage = lazy(() => import('@/features/sharing/SharedPage').then((m) => ({ default: m.SharedPage })));
const MembersPage = lazy(() => import('@/features/sharing/MembersPage').then((m) => ({ default: m.MembersPage })));
const ActivityPage = lazy(() => import('@/features/sharing/ActivityPage').then((m) => ({ default: m.ActivityPage })));
const InvitePage = lazy(() => import('@/features/sharing/InvitePage').then((m) => ({ default: m.InvitePage })));
const JoinPage = lazy(() => import('@/features/sharing/JoinPage').then((m) => ({ default: m.JoinPage })));
const SearchPage = lazy(() => import('@/features/search/SearchPage').then((m) => ({ default: m.SearchPage })));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import('@/features/settings/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const EditProfilePage = lazy(() => import('@/features/settings/simplePages').then((m) => ({ default: m.EditProfilePage })));
const AppearancePage = lazy(() => import('@/features/settings/simplePages').then((m) => ({ default: m.AppearancePage })));
const DefaultListPage = lazy(() => import('@/features/settings/simplePages').then((m) => ({ default: m.DefaultListPage })));
const AccountPage = lazy(() => import('@/features/settings/morePages').then((m) => ({ default: m.AccountPage })));
const NotificationSettingsPage = lazy(() => import('@/features/settings/morePages').then((m) => ({ default: m.NotificationSettingsPage })));
const UnitsPage = lazy(() => import('@/features/settings/morePages').then((m) => ({ default: m.UnitsPage })));
const PrivacyPage = lazy(() => import('@/features/settings/morePages').then((m) => ({ default: m.PrivacyPage })));
const HelpPage = lazy(() => import('@/features/settings/morePages').then((m) => ({ default: m.HelpPage })));
const DeleteAccountPage = lazy(() => import('@/features/settings/DeleteAccount').then((m) => ({ default: m.DeleteAccountPage })));
const AccountDeletedPage = lazy(() => import('@/features/settings/DeleteAccount').then((m) => ({ default: m.AccountDeletedPage })));
const LegalPage = lazy(() => import('@/features/legal/LegalPage').then((m) => ({ default: m.LegalPage })));

function App_({ children, bare }: { children: ReactNode; bare?: boolean }) {
  return (
    <RequireAuth>
      <AppShell bare={bare}>
        <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>{children}</Suspense>
      </AppShell>
    </RequireAuth>
  );
}

const loggedOut = (el: ReactNode) => <RedirectIfAuthed>{el}</RedirectIfAuthed>;

/** Route table from PRD section 5. W9: every route deep-links (host rewrites to index.html). */
export function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-dvh canvas-gradient" aria-busy="true" />}>
          <Routes>
            {/* Onboarding and auth, screens 01 to 12 */}
            <Route path="/" element={loggedOut(<Start />)} />
            <Route path="/signup" element={loggedOut(<SignUp />)} />
            <Route path="/login" element={loggedOut(<LogIn />)} />
            <Route path="/forgot" element={loggedOut(<ForgotPassword />)} />
            <Route path="/verify" element={<RequireConfig><VerifyEmail /></RequireConfig>} />
            <Route path="/reset" element={<RequireConfig><ResetPassword /></RequireConfig>} />
            <Route path="/auth/confirm" element={<RequireConfig><AuthConfirm /></RequireConfig>} />
            <Route path="/legal/:doc" element={<LegalPage />} />

            {/* Signed-in app */}
            <Route path="/home" element={<App_><HomePage /></App_>} />
            <Route path="/lists" element={<App_><ListsPage /></App_>} />
            <Route path="/lists/new" element={<App_><NewListRoute /></App_>} />
            <Route path="/lists/:id" element={<App_><ListsPage /></App_>} />
            <Route path="/lists/:id/shop" element={<App_ bare><ShoppingMode /></App_>} />
            <Route path="/lists/:id/members" element={<App_><MembersPage /></App_>} />
            <Route path="/lists/:id/activity" element={<App_><ActivityPage /></App_>} />
            <Route path="/lists/:id/invite" element={<App_><InvitePage /></App_>} />
            {/* H3: invite links open in any browser, signed in or not */}
            <Route path="/join/:token" element={<RequireConfig><JoinPage /></RequireConfig>} />
            <Route path="/j/:token" element={<RequireConfig><JoinPage /></RequireConfig>} />
            <Route path="/shared" element={<App_><SharedPage /></App_>} />
            {/* Profile and settings, screens 53 to 65 */}
            <Route path="/profile" element={<App_><ProfilePage /></App_>} />
            <Route path="/profile/edit" element={<App_><EditProfilePage /></App_>} />
            <Route path="/settings/account" element={<App_><AccountPage /></App_>} />
            <Route path="/settings/notifications" element={<App_><NotificationSettingsPage /></App_>} />
            <Route path="/settings/appearance" element={<App_><AppearancePage /></App_>} />
            <Route path="/settings/default-list" element={<App_><DefaultListPage /></App_>} />
            <Route path="/settings/units" element={<App_><UnitsPage /></App_>} />
            <Route path="/settings/privacy" element={<App_><PrivacyPage /></App_>} />
            <Route path="/settings/help" element={<App_><HelpPage /></App_>} />
            <Route path="/settings/delete" element={<App_><DeleteAccountPage /></App_>} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
            <Route path="/account-deleted" element={<AccountDeletedPage />} />
            <Route path="/search" element={<App_><SearchPage /></App_>} />
            <Route path="/notifications" element={<App_><NotificationsPage /></App_>} />

            <Route path="/dev/components" element={<ComponentGallery />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {/* W4: shown on every screen, including sign-in, so a new version always reaches the user */}
        <UpdateToast />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
