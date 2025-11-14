import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const WS_URL = 'ws://localhost:4000/ws';
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

export const useWebSocket = () => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [folderViewers, setFolderViewers] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const messageHandlers = useRef(new Map());

  const connect = useCallback((token) => {
    if (!token) return;

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Wait a bit for connection to be fully established
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            // Send authentication
            ws.current.send(JSON.stringify({
              type: 'auth',
              token
            }));
          }
        }, 100);

        // Start ping interval
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'connected':
              console.log('Authenticated as:', data.userName);
              break;

            case 'active_users':
              setActiveUsers(data.users);
              break;

            case 'user_joined':
              toast.success(`${data.userName} joined`, {
                duration: 2000,
                icon: '👋'
              });
              setActiveUsers(prev => [...prev, {
                userId: data.userId,
                userName: data.userName,
                currentFolder: null,
                lastActivity: Date.now()
              }]);
              break;

            case 'user_left':
              setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
              break;

            case 'folder_viewers':
              setFolderViewers(data.viewers);
              break;

            case 'user_viewing':
              if (data.folderId === currentFolder) {
                setFolderViewers(prev => {
                  const exists = prev.some(v => v.userId === data.userId);
                  if (!exists) {
                    return [...prev, { userId: data.userId, userName: data.userName }];
                  }
                  return prev;
                });
              }
              break;

            case 'file_changed':
              // Call registered handlers
              const handlers = messageHandlers.current.get('file_changed');
              if (handlers) {
                handlers.forEach(handler => handler(data));
              }

              // Show toast notification
              const operationText = {
                create: 'created',
                delete: 'deleted',
                rename: 'renamed',
                upload: 'uploaded'
              }[data.operation] || 'modified';

              toast(`${data.userName} ${operationText} "${data.item.name}"`, {
                duration: 3000,
                icon: data.operation === 'delete' ? '🗑️' : '📁'
              });
              break;

            case 'user_typing':
              // Call registered handlers
              const typingHandlers = messageHandlers.current.get('user_typing');
              if (typingHandlers) {
                typingHandlers.forEach(handler => handler(data));
              }
              break;

            case 'notification':
              // Handle incoming notifications
              toast(data.title, {
                duration: 4000,
                icon: data.type === 'share' ? '📁' : '🔔'
              });
              
              // Call registered handlers
              const notifHandlers = messageHandlers.current.get('notification');
              if (notifHandlers) {
                notifHandlers.forEach(handler => handler(data));
              }
              break;

            case 'unread_count':
              // Call registered handlers for unread count updates
              const countHandlers = messageHandlers.current.get('unread_count');
              if (countHandlers) {
                countHandlers.forEach(handler => handler(data));
              }
              break;

            case 'pong':
              // Keep-alive response
              break;

            case 'error':
              console.error('WebSocket error:', data.message);
              toast.error(data.message);
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setFolderViewers([]);
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }

        // Attempt reconnection
        reconnectTimeout.current = setTimeout(() => {
          const token = localStorage.getItem('auth_token');
          if (token) {
            connect(token);
          }
        }, RECONNECT_DELAY);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }, [currentFolder]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
    setActiveUsers([]);
    setFolderViewers([]);
  }, []);

  const navigateToFolder = useCallback((folderId) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'navigate_folder',
        folderId
      }));
      setCurrentFolder(folderId);
      setFolderViewers([]);
    }
  }, []);

  const notifyFileOperation = useCallback((operation, item, folderId) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'file_operation',
        operation,
        item,
        folderId
      }));
    }
  }, []);

  const notifyTyping = useCallback((folderId, action) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        folderId,
        action
      }));
    }
  }, []);

  const onMessage = useCallback((type, handler) => {
    if (!messageHandlers.current.has(type)) {
      messageHandlers.current.set(type, new Set());
    }
    messageHandlers.current.get(type).add(handler);

    // Return cleanup function
    return () => {
      const handlers = messageHandlers.current.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      connect(token);
    }

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    activeUsers,
    folderViewers,
    connect,
    disconnect,
    navigateToFolder,
    notifyFileOperation,
    notifyTyping,
    onMessage
  };
};
