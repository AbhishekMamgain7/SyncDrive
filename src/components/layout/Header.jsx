import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaUser, 
  FaBell, 
  FaCog, 
  FaSignOutAlt,
  FaFolder,
  FaChartLine,
  FaMemory,
  FaCogs
} from 'react-icons/fa';

const Header = ({ user, onLogout, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'files', label: 'Files', icon: FaFolder },
    { id: 'dashboard', label: 'Dashboard', icon: FaChartLine },
    { id: 'memory', label: 'Memory', icon: FaMemory },
    { id: 'processes', label: 'Processes', icon: FaCogs }
  ];

  return (
    <motion.header 
      className="navbar navbar-expand-lg navbar-dark bg-gradient-primary shadow-lg"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ backdropFilter: 'blur(10px)', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="container-fluid">
        <motion.div 
          className="navbar-brand d-flex align-items-center"
          whileHover={{ scale: 1.05 }}
        >
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <FaFolder className="me-2" size={24} />
          </motion.div>
          <span className="fw-bold fs-4">SyncDrive</span>
          <motion.span 
            className="badge bg-light text-primary ms-2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            v1.0
          </motion.span>
        </motion.div>

        <div className="navbar-nav me-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                className={`nav-link btn btn-link rounded-3 mx-1 px-3 py-2 ${
                  isActive 
                    ? 'bg-white text-dark fw-bold shadow-lg glow-animation' 
                    : 'bg-transparent text-white'
                }`}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ 
                  scale: 1.05, 
                  backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.15)',
                  boxShadow: isActive ? '0 6px 20px rgba(255,255,255,0.3)' : '0 4px 12px rgba(0,0,0,0.2)',
                  color: isActive ? '#000000' : '#ffffff'
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  border: isActive ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                <Icon className="me-2" size={16} />
                <span className="fw-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    className="ms-2 d-flex align-items-center"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-primary rounded-pill pulse-animation" 
                         style={{ width: '8px', height: '8px' }}></div>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="navbar-nav">
          <motion.button 
            className="nav-link btn btn-link text-white position-relative rounded-3 px-3 py-2 mx-1"
            whileHover={{ 
              scale: 1.05, 
              backgroundColor: 'rgba(255,255,255,0.15)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            whileTap={{ scale: 0.95 }}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <FaBell size={18} />
            <motion.span 
              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              3
            </motion.span>
          </motion.button>
          
          <motion.button 
            className="nav-link btn btn-link text-white rounded-3 px-3 py-2 mx-1"
            whileHover={{ 
              scale: 1.05, 
              backgroundColor: 'rgba(255,255,255,0.15)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            whileTap={{ scale: 0.95 }}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <FaCog size={18} />
          </motion.button>

          <div className="dropdown d-flex align-items-center">
            <motion.button
              type="button"
              className="nav-link dropdown-toggle btn btn-link text-white d-flex align-items-center rounded-3 px-3 py-2 mx-1"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: 'rgba(255,255,255,0.15)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
              whileTap={{ scale: 0.95 }}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <div className="bg-white bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center me-2"
                   style={{ width: '32px', height: '32px' }}>
                <FaUser size={14} />
              </div>
              <span className="fw-medium">{user?.name || 'User'}</span>
            </motion.button>
            <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0" 
                style={{ borderRadius: '12px', marginTop: '8px' }}>
              <li>
                <motion.button 
                  className="dropdown-item d-flex align-items-center px-3 py-2"
                  onClick={onLogout}
                  whileHover={{ backgroundColor: 'rgba(220, 53, 69, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FaSignOutAlt className="me-3 text-danger" />
                  <span>Logout</span>
                </motion.button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
