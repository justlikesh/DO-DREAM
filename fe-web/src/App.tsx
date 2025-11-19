// src/App.tsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { MemoProvider } from './contexts/MemoContext';
import Join from './pages/Join';
import ClassroomList from './pages/ClassroomList';
import Classroom from './pages/Classroom';
import EditorPage from './pages/EditorPage';
import StudentRoom from './pages/StudentRoom';
import ChatHistory from './pages/ChatHistory'; 
import './index.css';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const stored = localStorage.getItem('isLoggedIn');
    return stored === 'true';
  });

  const navigate = useNavigate();
  const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      await fetch(`${API_BASE}/api/auth/teacher/logout`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
    } finally {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('teacherName');
      localStorage.removeItem('accessToken');

      setIsLoggedIn(false);
      navigate('/');
    }
  };

  return (
    <MemoProvider>
      <Routes>
        {/* 로그인/회원가입 페이지 */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/classrooms" replace />
            ) : (
              <Join onLoginSuccess={handleLogin} />
            )
          }
        />

        {/* 반 선택 페이지 */}
        <Route
          path="/classrooms"
          element={
            isLoggedIn ? (
              <ClassroomList onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* 반별 자료함 & 학생 관리 페이지 */}
        <Route
          path="/classroom/:classroomId"
          element={isLoggedIn ? <Classroom /> : <Navigate to="/" replace />}
        />

        {/* 에디터 페이지 */}
        <Route
          path="/editor"
          element={isLoggedIn ? <EditorPage /> : <Navigate to="/" replace />}
        />

        {/* 학생 페이지 */}
        <Route
          path="/student/:studentId"
          element={isLoggedIn ? <StudentRoom /> : <Navigate to="/" replace />}
        />

        {/* 대화 기록 페이지 */}
        <Route
          path="/chat-history/:sessionId"
          element={isLoggedIn ? <ChatHistory /> : <Navigate to="/" replace />}
        />

        {/* 기본 라우트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoProvider>
  );
}