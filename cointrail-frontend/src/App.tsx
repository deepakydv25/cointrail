import { Route, Routes } from "react-router-dom"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ExpensesPage from "./pages/ExpensesPage"
import Navbar from "./components/Navbar"
import ProctectedRoute from "./routes/ProtectedRouter"
import CreateExpensePage from "./pages/CreateExpensePage"
import ExpenseDetailsPage from "./pages/ExpenseDetailsPage"

function App() {

  return (
    <>
      <Navbar />
      
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProctectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/create" element={<CreateExpensePage />} />
          <Route path="/expenses/:id" element={<ExpenseDetailsPage/>} />
        </Route>
      </Routes>
    </>
  );
}

export default App
