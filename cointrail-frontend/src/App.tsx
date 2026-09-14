import { Route, Routes } from "react-router-dom"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ExpensesPage from "./pages/ExpensesPage"
import Navbar from "./components/Navbar"

function App() {

  return (
    <>
      <Navbar />
      
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
      </Routes>
    </>
  );
}

export default App
