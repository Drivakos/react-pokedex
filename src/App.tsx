import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PokedexHome from './components/PokedexHome';
import React, { Suspense } from 'react';
import Navigation from './components/Navigation';

// Lazy load all non-critical components
const PokemonPage = React.lazy(() => import('./components/PokemonPage'));
const Login = React.lazy(() => import('./components/auth/Login'));
const SignUp = React.lazy(() => import('./components/auth/SignUp'));
const Profile = React.lazy(() => import('./components/auth/Profile'));
const AuthCallback = React.lazy(() => import('./components/auth/AuthCallback'));
const ResetPassword = React.lazy(() => import('./components/auth/ResetPassword'));
const ResetPasswordConfirm = React.lazy(() => import('./components/auth/ResetPasswordConfirm'));
const MagicLinkLogin = React.lazy(() => import('./components/auth/MagicLinkLogin'));
const ProtectedRoute = React.lazy(() => import('./components/auth/ProtectedRoute'));
const Teams = React.lazy(() => import('./components/teams/Teams'));
const TeamEditor = React.lazy(() => import('./components/teams/TeamEditor'));
const PokemonMemoryGame = React.lazy(() => import('./components/PokemonMemoryGame'));
const PokéGridChallenge = React.lazy(() => import('./components/PokéGridChallenge'));

const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  </div>
);

function AppContent() {
  return (
    <>
      <Navigation />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<PokedexHome />} />
          <Route path="/pokemon/:id" element={<PokemonPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/magic-link" element={<MagicLinkLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
          <Route path="/auth/update-password" element={<ResetPasswordConfirm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/teams" element={
            <ProtectedRoute>
              <Teams />
            </ProtectedRoute>
          } />
          <Route path="/team-editor/:teamId" element={
            <ProtectedRoute>
              <TeamEditor />
            </ProtectedRoute>
          } />
          <Route path="/memory-game" element={<PokemonMemoryGame />} />
          <Route path="/pkmn-grid-challenge" element={<PokéGridChallenge />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
export { AppContent };
