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
const BattleRunGame = React.lazy(() => import('./components/battle-game/BattleRunGame'));

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
          <Route path="/" element={<div data-testid="pokedex-home"><PokedexHome /></div>} />
          <Route path="/pokemon/:id" element={<div data-testid="pokemon-page"><PokemonPage /></div>} />
          <Route path="/login" element={<div data-testid="login"><Login /></div>} />
          <Route path="/signup" element={<div data-testid="signup"><SignUp /></div>} />
          <Route path="/magic-link" element={<div data-testid="magic-link-login"><MagicLinkLogin /></div>} />
          <Route path="/reset-password" element={<div data-testid="reset-password"><ResetPassword /></div>} />
          <Route path="/reset-password/confirm" element={<div data-testid="reset-password-confirm"><ResetPasswordConfirm /></div>} />
          <Route path="/auth/update-password" element={<div data-testid="reset-password-confirm"><ResetPasswordConfirm /></div>} />
          <Route path="/auth/callback" element={<div data-testid="auth-callback"><AuthCallback /></div>} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <div data-testid="profile"><Profile /></div>
            </ProtectedRoute>
          } />
          <Route path="/teams" element={
            <ProtectedRoute>
              <div data-testid="teams"><Teams /></div>
            </ProtectedRoute>
          } />
          <Route path="/team-editor/:teamId" element={
            <ProtectedRoute>
              <div data-testid="team-editor"><TeamEditor /></div>
            </ProtectedRoute>
          } />
          <Route path="/memory-game" element={<div data-testid="pokemon-memory-game"><PokemonMemoryGame /></div>} />
          <Route path="/pkmn-grid-challenge" element={<div data-testid="pokegrid-challenge"><PokéGridChallenge /></div>} />
          <Route path="/battle-run" element={<div data-testid="battle-run-game"><BattleRunGame /></div>} />
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
