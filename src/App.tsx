import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PokedexHome from './components/PokedexHome';
import PokemonPage from './components/PokemonPage';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Profile from './components/auth/Profile';
import AuthCallback from './components/auth/AuthCallback';
import ResetPassword from './components/auth/ResetPassword';
import ResetPasswordConfirm from './components/auth/ResetPasswordConfirm';
import MagicLinkLogin from './components/auth/MagicLinkLogin';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navigation from './components/Navigation';
import React, { Suspense } from 'react';
import Teams from './components/teams/Teams';
import TeamEditor from './components/teams/TeamEditor';

// Lazy load the memory game for better bundle splitting
const PokemonMemoryGame = React.lazy(() => import('./components/PokemonMemoryGame'));

function App() {
  return (
    <Router>
      <Navigation />
      <div>
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
          <Route path="/memory-game" element={
            <Suspense>
              <PokemonMemoryGame />
            </Suspense>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
