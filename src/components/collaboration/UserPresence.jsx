import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaCircle, FaEye } from 'react-icons/fa';

const UserPresence = ({ activeUsers, folderViewers, isConnected }) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="user-presence position-relative">
      {/* Connection Status */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <motion.div
          animate={{
            scale: isConnected ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isConnected ? Infinity : 0
          }}
        >
          <FaCircle
            size={8}
            className={isConnected ? 'text-success' : 'text-danger'}
          />
        </motion.div>
        <small className="text-muted">
          {isConnected ? 'Connected' : 'Disconnected'}
        </small>
      </div>

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div
            className="d-flex align-items-center gap-2 cursor-pointer"
            onClick={() => setShowDetails(!showDetails)}
            style={{ cursor: 'pointer' }}
          >
            <div className="d-flex align-items-center">
              <div className="avatar-stack">
                {activeUsers.slice(0, 3).map((user, index) => (
                  <motion.div
                    key={user.userId}
                    className="avatar-circle"
                    style={{
                      marginLeft: index > 0 ? '-8px' : '0',
                      zIndex: 3 - index
                    }}
                    whileHover={{ scale: 1.1, zIndex: 10 }}
                    title={user.userName}
                  >
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                         style={{ width: '28px', height: '28px', fontSize: '0.75rem', border: '2px solid white' }}>
                      {user.userName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </motion.div>
                ))}
                {activeUsers.length > 3 && (
                  <div
                    className="avatar-circle bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '28px', height: '28px', fontSize: '0.7rem', marginLeft: '-8px', border: '2px solid white' }}
                  >
                    +{activeUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
            <small className="text-muted">
              {activeUsers.length} online
            </small>
          </div>

          {/* Detailed User List */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2 bg-light rounded-3"
                style={{ overflow: 'hidden' }}
              >
                {activeUsers.map(user => (
                  <div key={user.userId} className="d-flex align-items-center gap-2 py-1">
                    <FaCircle size={6} className="text-success" />
                    <small className="text-dark">{user.userName}</small>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Folder Viewers */}
      {folderViewers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="folder-viewers p-2 bg-info bg-opacity-10 rounded-3 border border-info border-opacity-25"
        >
          <div className="d-flex align-items-center gap-2 mb-2">
            <FaEye className="text-info" size={14} />
            <small className="fw-bold text-info">Viewing this folder:</small>
          </div>
          {folderViewers.map(viewer => (
            <motion.div
              key={viewer.userId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="d-flex align-items-center gap-2 py-1"
            >
              <div className="bg-info text-white rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '20px', height: '20px', fontSize: '0.65rem' }}>
                {viewer.userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <small className="text-dark">{viewer.userName}</small>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default UserPresence;
