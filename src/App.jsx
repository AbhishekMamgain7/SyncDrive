import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import FileBrowser from './components/files/FileBrowser';
import Dashboard from './components/dashboard/Dashboard';
import MemoryManagement from './components/os/MemoryManagement';
import ProcessScheduling from './components/os/ProcessScheduling';
import DeadlockDetection from './components/os/DeadlockDetection';
import AuthPage from './components/auth/AuthPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const MainApp = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('files');

  const renderContent = () => {
    switch (activeTab) {
      case 'files':
        return <FileBrowser />;
      case 'dashboard':
        return <Dashboard />;
      case 'memory':
        return <MemoryManagement />;
      case 'processes':
        return <ProcessScheduling />;
      case 'deadlock':
        return <DeadlockDetection />;
      default:
        return <FileBrowser />;
    }
  };

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <Header 
        user={user} 
        onLogout={logout}
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />
      
      <div className="main-content d-flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user}
        />
        
        <div className="content-area flex-grow-1" id="main-content" role="main" tabIndex="-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-100"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
