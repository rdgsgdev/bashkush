import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MealsPage } from './pages/MealsPage';
import { CalendarPage } from './pages/CalendarPage';
import { GroceryListPage } from './pages/GroceryListPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/meals" element={<MealsPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/grocery" element={<GroceryListPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
