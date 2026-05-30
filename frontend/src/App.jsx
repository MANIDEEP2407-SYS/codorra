import { Routes, Route } from 'react-router-dom';
import GhostLayer from './components/GhostLayer';
import Landing from './pages/Landing';
import Deposit from './pages/Deposit';
import Dashboard from './pages/Dashboard';

// main app layout - ghostlayer sits behind everything
// and routes handle the 3 pages
export default function App() {
  return (
    <>
      <GhostLayer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}
