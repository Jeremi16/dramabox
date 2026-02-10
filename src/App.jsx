import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AppLayout from "./components/AppLayout";
import ForYouPage from "./pages/ForYouPage";
import NewPage from "./pages/NewPage";
import RankPage from "./pages/RankPage";
import SearchPage from "./pages/SearchPage";
import WatchPage from "./pages/WatchPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/for-you" />} />
        <Route path="/for-you" element={<ForYouPage />} />
        <Route path="/new" element={<NewPage />} />
        <Route path="/rank" element={<RankPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/watch/:seriesId" element={<WatchPage />} />
      </Route>
    </Routes>
  );
}

export default App;
