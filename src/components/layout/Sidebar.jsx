import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaFolder,
  FaFile,
  FaUpload,
  FaDownload,
  FaTrash,
  FaUsers,
  FaShieldAlt,
  FaHistory,
  FaChartBar,
  FaMemory,
  FaCogs,
  FaNetworkWired,
  FaUserFriends
} from 'react-icons/fa';

const Sidebar = ({ activeTab, setActiveTab, user }) => {
  // Context-aware menu based on active tab
  const getContextualMenu = () => {
    switch(activeTab) {
      case 'files':
        return [
          {
            id: 'quick-actions',
            title: 'Quick Actions',
            icon: FaFolder,
            items: [
              { id: 'recent', label: 'Recent Files', icon: FaHistory },
              { id: 'shared', label: 'Shared with me', icon: FaUserFriends },
              { id: 'trash', label: 'Trash', icon: FaTrash }
            ]
          }
        ];
      case 'dashboard':
        return [
          {
            id: 'dashboard-actions',
            title: 'Dashboard',
            icon: FaChartBar,
            items: [
              { id: 'refresh', label: 'Refresh Data', icon: FaHistory },
              { id: 'export', label: 'Export Report', icon: FaDownload }
            ]
          }
        ];
      case 'memory':
      case 'processes':
      case 'deadlock':
        return [
          {
            id: 'os-simulations',
            title: 'OS Simulations',
            icon: FaCogs,
            items: [
              { id: 'memory', label: 'Memory Management', icon: FaMemory },
              { id: 'processes', label: 'Process Scheduling', icon: FaCogs },
              { id: 'deadlock', label: 'Deadlock Detection', icon: FaShieldAlt }
            ]
          }
        ];
      default:
        return [];
    }
  };

  const menuItems = getContextualMenu();

  return (
    <motion.aside 
      className="sidebar bg-gradient-primary border-end shadow-lg"
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: '280px', height: 'calc(100vh - 76px)', overflowY: 'auto' }}
    >
      <div className="p-3">
        <motion.div 
          className="user-info mb-4 p-3 bg-gradient-primary rounded-3 shadow-lg"
          whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="d-flex align-items-center">
            <motion.div 
              className="avatar bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
              style={{ width: '50px', height: '50px' }}
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              {user?.name?.charAt(0) || 'U'}
            </motion.div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>{user?.name || 'User'}</div>
              <small className="text-primary fw-medium" style={{ fontSize: '12px' }}>{user?.role || 'User'}</small>
              <div className="d-flex align-items-center mt-1">
                <div className="status-indicator status-online"></div>
              </div>
            </div>
          </div>
        </motion.div>

        <nav>
          {menuItems.map((section, sectionIndex) => {
            const SectionIcon = section.icon;
            return (
              <motion.div 
                key={section.id} 
                className="mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIndex * 0.1 }}
              >
                <motion.div 
                  className="d-flex align-items-center mb-3 text-white"
                  whileHover={{ x: 5 }}
                  style={{ minHeight: '24px' }}
                >
                  <SectionIcon className="me-2" size={16} style={{ flexShrink: 0 }} />
                  <small className="fw-bold text-uppercase" style={{ lineHeight: 1.2 }}>
                    {section.title}
                  </small>
                </motion.div>
                
                <ul className="list-unstyled">
                  {section.items.map((item, itemIndex) => {
                    const ItemIcon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <motion.li 
                        key={item.id} 
                        className="mb-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (sectionIndex * 0.1) + (itemIndex * 0.05) }}
                      >
                        <motion.button
                          className={`btn btn-link w-100 text-start d-flex align-items-center rounded-3 ${
                            isActive 
                              ? 'bg-white text-primary shadow-sm fw-bold' 
                              : 'text-white'
                          }`}
                          onClick={() => setActiveTab(item.id)}
                          whileHover={{ 
                            x: 5, 
                            scale: 1.02,
                            backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.1)',
                            color: '#007bff'
                          }}
                          whileTap={{ scale: 0.98 }}
                          style={{ 
                            textDecoration: 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <ItemIcon className="me-3" size={16} />
                          <span>{item.label}</span>
                          {isActive && (
                            <motion.div
                              className="ms-auto"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="bg-primary rounded-pill" style={{ width: '4px', height: '4px' }}></div>
                            </motion.div>
                          )}
                        </motion.button>
                      </motion.li>
                    );
                  })}
                </ul>
              </motion.div>
            );
          })}
        </nav>
      
        {/* Storage Usage Widget */}
        {activeTab === 'files' && (
          <motion.div
            className="mt-4 p-3 bg-gradient-primary rounded-3 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-dark fw-bold">Storage</small>
              <small className="text-primary">68.5%</small>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-primary"
                style={{ width: '68.5%' }}
                role="progressbar"
                aria-valuenow="68.5"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Storage usage"
              />
            </div>
            <small className="text-dark" style={{ opacity: 1.0 }}>6.85 GB of 10 GB used</small>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
