import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import FallDetail from './pages/FallDetail';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fall/:fallId" element={<FallDetail />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
