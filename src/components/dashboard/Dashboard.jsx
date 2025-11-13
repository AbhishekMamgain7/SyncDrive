import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaChartLine, 
  FaUsers, 
  FaFolder, 
  FaMemory, 
  FaCogs, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaNetworkWired,
  FaDatabase,
  FaShieldAlt
} from 'react-icons/fa';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement
);

const Dashboard = () => {
  const [systemStats, setSystemStats] = useState({
    totalUsers: 156,
    activeUsers: 23,
    totalFiles: 2847,
    storageUsed: 68.5,
    memoryUsage: 45.2,
    cpuUsage: 32.1,
    networkActivity: 89.7,
    systemHealth: 'good'
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, user: 'John Doe', action: 'Uploaded file', file: 'project-docs.pdf', time: '2 minutes ago', type: 'upload' },
    { id: 2, user: 'Jane Smith', action: 'Created folder', file: 'New Project', time: '5 minutes ago', type: 'folder' },
    { id: 3, user: 'Mike Johnson', action: 'Shared file', file: 'presentation.pptx', time: '8 minutes ago', type: 'share' },
    { id: 4, user: 'Sarah Wilson', action: 'Deleted file', file: 'old-draft.txt', time: '12 minutes ago', type: 'delete' },
    { id: 5, user: 'Tom Brown', action: 'Downloaded file', file: 'data.csv', time: '15 minutes ago', type: 'download' }
  ]);

  const [systemAlerts, setSystemAlerts] = useState([
    { id: 1, type: 'warning', message: 'Memory usage above 80%', time: '5 minutes ago', severity: 'medium' },
    { id: 2, type: 'info', message: 'Scheduled backup completed', time: '1 hour ago', severity: 'low' },
    { id: 3, type: 'error', message: 'Failed login attempt detected', time: '2 hours ago', severity: 'high' }
  ]);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        ...prev,
        memoryUsage: Math.max(10, Math.min(95, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        cpuUsage: Math.max(5, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 8)),
        networkActivity: Math.max(20, Math.min(100, prev.networkActivity + (Math.random() - 0.5) * 10)),
        activeUsers: Math.max(15, Math.min(50, prev.activeUsers + Math.floor((Math.random() - 0.5) * 3)))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const storageData = {
    labels: ['Used Storage', 'Available Storage'],
    datasets: [
      {
        data: [systemStats.storageUsed, 100 - systemStats.storageUsed],
        backgroundColor: ['#ff6384', '#36a2eb'],
        borderColor: ['#ff6384', '#36a2eb'],
        borderWidth: 2
      }
    ]
  };

  const performanceData = {
    labels: ['CPU', 'Memory', 'Network', 'Disk I/O'],
    datasets: [
      {
        label: 'Usage (%)',
        data: [
          systemStats.cpuUsage,
          systemStats.memoryUsage,
          systemStats.networkActivity,
          75.3
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const userActivityData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: 'Active Users',
        data: [5, 8, 45, 67, 23, 15],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      },
      {
        label: 'File Operations',
        data: [12, 19, 156, 234, 89, 67],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4
      }
    ]
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'upload': return <FaFolder className="text-primary" />;
      case 'download': return <FaFolder className="text-success" />;
      case 'share': return <FaUsers className="text-info" />;
      case 'delete': return <FaFolder className="text-danger" />;
      case 'folder': return <FaFolder className="text-warning" />;
      default: return <FaClock className="text-muted" />;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return <FaExclamationTriangle className="text-danger" />;
      case 'warning': return <FaExclamationTriangle className="text-warning" />;
      case 'info': return <FaCheckCircle className="text-info" />;
      default: return <FaClock className="text-muted" />;
    }
  };

  const getAlertClass = (severity) => {
    switch (severity) {
      case 'high': return 'border-danger bg-danger bg-opacity-10';
      case 'medium': return 'border-warning bg-warning bg-opacity-10';
      case 'low': return 'border-info bg-info bg-opacity-10';
      default: return 'border-secondary bg-secondary bg-opacity-10';
    }
  };

  return (
    <div className="dashboard p-4" role="main" aria-label="Dashboard">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h2 className="mb-2">Dashboard Overview</h2>
        <p className="text-muted">Real-time system monitoring and analytics</p>
      </motion.div>
      
      <div className="row">
        {/* System Overview Cards */}
        <div className="col-12 mb-4">
          <div className="row">
            <div className="col-lg-3 col-md-6 mb-3">
              <motion.div
                className="card bg-primary text-white"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Total Users</h6>
                      <h3 className="mb-0">{systemStats.totalUsers}</h3>
                    </div>
                    <FaUsers size={32} />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="col-lg-3 col-md-6 mb-3">
              <motion.div
                className="card bg-success text-white"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Active Users</h6>
                      <h3 className="mb-0">{systemStats.activeUsers}</h3>
                    </div>
                    <FaChartLine size={32} />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="col-lg-3 col-md-6 mb-3">
              <motion.div
                className="card bg-info text-white"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Total Files</h6>
                      <h3 className="mb-0">{systemStats.totalFiles.toLocaleString()}</h3>
                    </div>
                    <FaFolder size={32} />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="col-lg-3 col-md-6 mb-3">
              <motion.div
                className="card bg-warning text-white"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Storage Used</h6>
                      <h3 className="mb-0">{systemStats.storageUsed}%</h3>
                    </div>
                    <FaDatabase size={32} />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">System Performance</h6>
            </div>
            <div className="card-body">
              <Bar data={performanceData} options={{ responsive: true }} />
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Storage Usage</h6>
            </div>
            <div className="card-body">
              <Doughnut data={storageData} options={{ responsive: true }} />
            </div>
          </div>
        </div>

        {/* Activity Charts */}
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">User Activity Over Time</h6>
            </div>
            <div className="card-body">
              <Line data={userActivityData} options={{ responsive: true }} />
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">System Health</h6>
            </div>
            <div className="card-body">
              <div className="system-health">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span>Overall Status</span>
                  <span className={`badge ${
                    systemStats.systemHealth === 'good' ? 'bg-success' : 
                    systemStats.systemHealth === 'warning' ? 'bg-warning' : 'bg-danger'
                  }`}>
                    {systemStats.systemHealth.toUpperCase()}
                  </span>
                </div>
                
                <div className="health-metrics">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Memory</span>
                    <div className="progress" style={{ width: '60%', height: '8px' }}>
                      <div 
                        className={`progress-bar ${
                          systemStats.memoryUsage > 80 ? 'bg-danger' : 
                          systemStats.memoryUsage > 60 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${systemStats.memoryUsage}%` }}
                      />
                    </div>
                    <span className="ms-2">{systemStats.memoryUsage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>CPU</span>
                    <div className="progress" style={{ width: '60%', height: '8px' }}>
                      <div 
                        className={`progress-bar ${
                          systemStats.cpuUsage > 80 ? 'bg-danger' : 
                          systemStats.cpuUsage > 60 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${systemStats.cpuUsage}%` }}
                      />
                    </div>
                    <span className="ms-2">{systemStats.cpuUsage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Network</span>
                    <div className="progress" style={{ width: '60%', height: '8px' }}>
                      <div 
                        className={`progress-bar ${
                          systemStats.networkActivity > 80 ? 'bg-danger' : 
                          systemStats.networkActivity > 60 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${systemStats.networkActivity}%` }}
                      />
                    </div>
                    <span className="ms-2">{systemStats.networkActivity.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Recent Activity</h6>
            </div>
            <div className="card-body">
              <div className="activity-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {recentActivity.map((activity) => (
                  <motion.div
                    key={activity.id}
                    className="d-flex align-items-center p-2 border-bottom"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ backgroundColor: 'rgba(0,123,255,0.1)' }}
                  >
                    <div className="me-3">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold">{activity.user}</div>
                      <div className="small text-muted">
                        {activity.action} "{activity.file}"
                      </div>
                    </div>
                    <div className="text-muted small">
                      {activity.time}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">System Alerts</h6>
            </div>
            <div className="card-body">
              <div className="alerts-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {systemAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    className={`p-3 border rounded mb-2 ${getAlertClass(alert.severity)}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold">{alert.message}</div>
                        <div className="small text-muted">{alert.time}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
