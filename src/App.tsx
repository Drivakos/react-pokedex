import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PokedexHome from './components/PokedexHome';
import PokemonPage from './components/PokemonPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PokedexHome />} />
        <Route path="/pokemon/:id" element={<PokemonPage />} />
      </Routes>
    </Router>
  );
}

export default App;
