import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

let wss = null;
const activeUsers = new Map(); // userId -> { ws, name, currentFolder, lastActivity }
const folderViewers = new Map(); // folderId -> Set of userIds

export function initializeWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let userId = null;
    let userName = null;

    // Handle authentication
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // Authentication message
        if (data.type === 'auth') {
          const token = data.token;
          if (!token) {
            ws.send(JSON.stringify({ type: 'error', message: 'No token provided' }));
            ws.close();
            return;
          }

          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
            userId = decoded.id;
            userName = decoded.name;

            // Store user connection
            activeUsers.set(userId, {
              ws,
              name: userName,
              currentFolder: null,
              lastActivity: Date.now()
            });

            // Send connection success
            ws.send(JSON.stringify({
              type: 'connected',
              userId,
              userName
            }));

            // Broadcast user joined
            broadcastToAll({
              type: 'user_joined',
              userId,
              userName,
              timestamp: new Date().toISOString()
            }, userId);

            // Send current active users
            ws.send(JSON.stringify({
              type: 'active_users',
              users: Array.from(activeUsers.entries())
                .filter(([id]) => id !== userId)
                .map(([id, data]) => ({
                  userId: id,
                  userName: data.name,
                  currentFolder: data.currentFolder,
                  lastActivity: data.lastActivity
                }))
            }));

          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            ws.close();
            return;
          }
        }

        // Folder navigation
        if (data.type === 'navigate_folder' && userId) {
          const { folderId } = data;
          const user = activeUsers.get(userId);
          
          // Remove from previous folder viewers
          if (user.currentFolder) {
            const viewers = folderViewers.get(user.currentFolder);
            if (viewers) {
              viewers.delete(userId);
              if (viewers.size === 0) {
                folderViewers.delete(user.currentFolder);
              }
            }
          }

          // Add to new folder viewers
          user.currentFolder = folderId;
          user.lastActivity = Date.now();
          
          if (folderId) {
            if (!folderViewers.has(folderId)) {
              folderViewers.set(folderId, new Set());
            }
            folderViewers.get(folderId).add(userId);
          }

          // Notify other users in the same folder
          broadcastToFolder(folderId, {
            type: 'user_viewing',
            userId,
            userName,
            folderId,
            timestamp: new Date().toISOString()
          }, userId);

          // Send current viewers to the user
          if (folderId) {
            const viewers = Array.from(folderViewers.get(folderId) || [])
              .filter(id => id !== userId)
              .map(id => {
                const userData = activeUsers.get(id);
                return {
                  userId: id,
                  userName: userData?.name
                };
              });

            ws.send(JSON.stringify({
              type: 'folder_viewers',
              folderId,
              viewers
            }));
          }
        }

        // File/Folder operations
        if (data.type === 'file_operation' && userId) {
          const { operation, item, folderId } = data;
          user.lastActivity = Date.now();

          // Broadcast to users in the same folder
          broadcastToFolder(folderId, {
            type: 'file_changed',
            operation, // 'create', 'delete', 'rename', 'upload'
            item,
            folderId,
            userId,
            userName,
            timestamp: new Date().toISOString()
          }, userId);
        }

        // Typing indicator
        if (data.type === 'typing' && userId) {
          const { folderId, action } = data;
          broadcastToFolder(folderId, {
            type: 'user_typing',
            userId,
            userName,
            action, // 'renaming', 'creating_folder', etc.
            timestamp: new Date().toISOString()
          }, userId);
        }

        // Heartbeat/ping
        if (data.type === 'ping' && userId) {
          const user = activeUsers.get(userId);
          if (user) {
            user.lastActivity = Date.now();
          }
          ws.send(JSON.stringify({ type: 'pong' }));
        }

      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (userId) {
        // Remove from folder viewers
        const user = activeUsers.get(userId);
        if (user && user.currentFolder) {
          const viewers = folderViewers.get(user.currentFolder);
          if (viewers) {
            viewers.delete(userId);
            if (viewers.size === 0) {
              folderViewers.delete(user.currentFolder);
            }
          }
        }

        // Remove from active users
        activeUsers.delete(userId);

        // Broadcast user left
        broadcastToAll({
          type: 'user_left',
          userId,
          userName,
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Clean up inactive connections every 30 seconds
  setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 1 minute

    activeUsers.forEach((user, userId) => {
      if (now - user.lastActivity > timeout) {
        user.ws.close();
        activeUsers.delete(userId);
        broadcastToAll({
          type: 'user_left',
          userId,
          userName: user.name,
          timestamp: new Date().toISOString()
        });
      }
    });
  }, 30000);

  return wss;
}

// Broadcast to all connected users
function broadcastToAll(message, excludeUserId = null) {
  const messageStr = JSON.stringify(message);
  activeUsers.forEach((user, userId) => {
    if (userId !== excludeUserId && user.ws.readyState === 1) {
      user.ws.send(messageStr);
    }
  });
}

// Broadcast to users viewing a specific folder
function broadcastToFolder(folderId, message, excludeUserId = null) {
  const viewers = folderViewers.get(folderId);
  if (!viewers) return;

  const messageStr = JSON.stringify(message);
  viewers.forEach(userId => {
    if (userId !== excludeUserId) {
      const user = activeUsers.get(userId);
      if (user && user.ws.readyState === 1) {
        user.ws.send(messageStr);
      }
    }
  });
}

// Broadcast file operation to specific folder
export function broadcastFileOperation(operation, item, folderId, userId, userName) {
  if (!wss) return;

  broadcastToFolder(folderId, {
    type: 'file_changed',
    operation,
    item,
    folderId,
    userId,
    userName,
    timestamp: new Date().toISOString()
  });
}

// Broadcast to a specific user
export function broadcastToUser(userId, type, data) {
  const userConnection = activeUsers.get(userId);
  if (userConnection && userConnection.ws.readyState === 1) {
    userConnection.ws.send(JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    }));
  }
}

export { wss, activeUsers, folderViewers };
