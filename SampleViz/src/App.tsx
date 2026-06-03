import { BrowserRouter, Routes, Route } from "react-router";
import { Navbar } from "./components/navbar";
import HomePage from "./pages/home";
import CreatePage from "./pages/create";
import MyVizPage from "./pages/myViz";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 inter">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/my-viz" element={<MyVizPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
