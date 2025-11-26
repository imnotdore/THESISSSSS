// src/App.jsx - UPDATED WITH NOTIFICATION ROUTES REMOVED
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ToDoPage from "./pages/ToDoPage";
import ReviewPage from "./pages/ReviewPage";
import ClassDetails from "./pages/ClassDetails";
import ExamRoomWrapper from "./pages/ExamRoomWrapper";
import ExamFormView from "./pages/ExamFormView";
import AuthSuccess from "./pages/AuthSuccess";
import QuizFormPage from "./pages/QuizFormPage";
import StudentQuizPage from "./pages/StudentQuizPage";
import TeacherExamSession from "./pages/TeacherExamSession";
import StudentExamSession from "./pages/StudentExamSession";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* ✅ DEFAULT ROUTE REDIRECTS TO LOGIN */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/success" element={<AuthSuccess />} />

          {/* ✅ PROTECTED ROUTES */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Class and Quiz Routes */}
          <Route path="/class/:classId" element={
            <ProtectedRoute>
              <ClassDetails />
            </ProtectedRoute>
          } />

          {/* ✅ ADDED: QUIZ CREATION ROUTES - FIX FOR DEPLOYMENT ISSUE */}
          <Route path="/class/:classId/quiz/new" element={
            <ProtectedRoute requiredRole="teacher">
              <QuizFormPage />
            </ProtectedRoute>
          } />

          <Route path="/class/:classId/quiz/:examId/edit" element={
            <ProtectedRoute requiredRole="teacher">
              <QuizFormPage />
            </ProtectedRoute>
          } />

          {/* Legacy routes for backward compatibility */}
          <Route path="/quiz-form" element={
            <ProtectedRoute requiredRole="teacher">
              <QuizFormPage />
            </ProtectedRoute>
          } />

          {/* Exam and Quiz Session Routes */}
          <Route path="/student-quiz/:examId" element={
            <ProtectedRoute requiredRole="student">
              <StudentQuizPage />
            </ProtectedRoute>
          } />

          <Route path="/teacher-exam/:examId" element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherExamSession />
            </ProtectedRoute>
          } />

          <Route path="/student-exam/:examId" element={
            <ProtectedRoute requiredRole="student">
              <StudentExamSession />
            </ProtectedRoute>
          } />

          <Route path="/exam-room/:examId" element={
            <ProtectedRoute>
              <ExamRoomWrapper />
            </ProtectedRoute>
          } />

          <Route path="/exam-form/:examId?" element={
            <ProtectedRoute requiredRole="teacher">
              <ExamFormView />
            </ProtectedRoute>
          } />

          {/* Other Protected Routes */}
          <Route path="/todo" element={
            <ProtectedRoute requiredRole="student">
              <ToDoPage />
            </ProtectedRoute>
          } />

          <Route path="/review" element={
            <ProtectedRoute requiredRole="teacher">
              <ReviewPage />
            </ProtectedRoute>
          } />

          {/* ✅ NOTIFICATION ROUTES REMOVED */}

          {/* Catch all route - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;