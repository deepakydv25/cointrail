import { Route, Routes } from "react-router-dom"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ExpensesPage from "./pages/ExpensesPage"
import Navbar from "./components/Navbar"
import ProctectedRoute from "./routes/ProtectedRoute"
import CreateExpensePage from "./pages/CreateExpensePage"
import ExpenseDetailsPage from "./pages/ExpenseDetailsPage"
import EditExpensePage from "./pages/EditExpensePage"
import LandingPage from "./pages/LandingPage"
import PublicRoute from "./routes/PublicRoute"
import NotFoundPage from "./pages/NotFoundPage"

function App() {

  return (
    <>
      <Navbar />
      
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicRoute/>}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProctectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/create" element={<CreateExpensePage />} />
          <Route path="/expenses/:id" element={<ExpenseDetailsPage/>} />
          <Route path="/expenses/:id/edit" element={<EditExpensePage/>} />
        </Route>

        <Route path="*" element={<NotFoundPage/>}/>
      </Routes>
    </>
  );
}

export default App
