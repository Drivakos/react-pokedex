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
import TeamBuilder from './components/teams/TeamBuilder';

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
              <TeamBuilder />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
