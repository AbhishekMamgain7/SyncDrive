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
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const MainApp = () => {
  const { user, isAuthenticated } = useAuth();
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
    return (
      <div className="auth-container">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-4">
            <h2 className="fw-bold">Welcome to SyncDrive</h2>
            <p className="text-muted">Multi-user File Management System with OS Simulation</p>
          </div>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Initializing system...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />
      
      <div className="main-content d-flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user}
        />
        
        <div className="content-area flex-grow-1">
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
