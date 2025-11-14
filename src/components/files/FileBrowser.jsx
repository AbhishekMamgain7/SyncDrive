import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaFolder, 
  FaFile, 
  FaUpload, 
  FaPlus, 
  FaSearch, 
  FaTh, 
  FaList,
  FaSort,
  FaEllipsisV,
  FaDownload,
  FaTrash,
  FaEdit,
  FaShare,
  FaCopy,
  FaCheck,
  FaSpinner,
  FaHistory,
  FaUserFriends
} from 'react-icons/fa';
import useFileStore from '../../store/fileStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import UserPresence from '../collaboration/UserPresence';
import FileVersionHistory from './FileVersionHistory';
import AdvancedSearch from '../search/AdvancedSearch';
import ShareFolderModal from '../sharing/ShareFolderModal';

const FileBrowser = () => {
  const {
    files,
    isLoading,
    isUploading,
    error,
    currentPath,
    selectedItems,
    searchQuery,
    viewMode,
    sortBy,
    sortOrder,
    fetchFiles,
    setSelectedItems,
    setSearchQuery,
    setViewMode,
    setSortBy,
    setSortOrder,
    createFolder,
    deleteItems,
    renameItem,
    uploadFile,
    navigateToFolder,
    navigateToBreadcrumb,
    getFilteredAndSortedFiles
  } = useFileStore();

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuItem, setContextMenuItem] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionFile, setVersionFile] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFolder, setShareFolder] = useState(null);
  const fileInputRef = React.useRef(null);

  // WebSocket for real-time collaboration
  const {
    isConnected,
    activeUsers,
    folderViewers,
    navigateToFolder: wsNavigateToFolder,
    onMessage
  } = useWebSocket();

  // Load root directory on mount
  useEffect(() => {
    fetchFiles(null);
  }, []);

  // WebSocket: Listen for file changes
  useEffect(() => {
    const cleanup = onMessage('file_changed', (data) => {
      const currentFolderId = currentPath[currentPath.length - 1]?.id;
      
      // Refresh if the change is in the current folder
      if (data.folderId === currentFolderId || (data.folderId === null && currentFolderId === null)) {
        fetchFiles(currentFolderId);
      }
    });

    return cleanup;
  }, [onMessage, currentPath, fetchFiles]);

  // WebSocket: Notify when navigating to a folder
  useEffect(() => {
    const currentFolderId = currentPath[currentPath.length - 1]?.id;
    wsNavigateToFolder(currentFolderId || null);
  }, [currentPath, wsNavigateToFolder]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete key - delete selected items
      if (e.key === 'Delete' && selectedItems.length > 0) {
        handleDeleteSelected();
      }
      // Escape key - clear selection
      if (e.key === 'Escape') {
        setSelectedItems([]);
        setShowContextMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems]);

  const currentItems = getFilteredAndSortedFiles();
  const breadcrumbs = currentPath;

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      navigateToFolder(item);
    }
  };

  const handleItemSelect = (item, event) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      setSelectedItems(
        selectedItems.includes(item.id)
          ? selectedItems.filter(id => id !== item.id)
          : [...selectedItems, item.id]
      );
    } else {
      setSelectedItems([item.id]);
    }
  };

  const handleContextMenu = (item, event) => {
    event.preventDefault();
    setContextMenuItem(item);
    setContextMenuPos({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const currentFolderId = currentPath[currentPath.length - 1].id;
        await createFolder(newFolderName.trim(), currentFolderId);
        setNewFolderName('');
        setShowCreateFolder(false);
      } catch (error) {
        // Error already handled by store
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;

    const itemsToDelete = currentItems.filter(item => selectedItems.includes(item.id));
    const itemNames = itemsToDelete.map(item => item.name).join(', ');
    const itemCount = itemsToDelete.length;
    const folderCount = itemsToDelete.filter(item => item.type === 'folder').length;
    const fileCount = itemsToDelete.filter(item => item.type === 'file').length;

    let confirmMessage = `Are you sure you want to delete ${itemCount} item(s)?\n\n`;
    if (folderCount > 0) confirmMessage += `📁 Folders: ${folderCount}\n`;
    if (fileCount > 0) confirmMessage += `📄 Files: ${fileCount}\n`;
    if (folderCount > 0) confirmMessage += `\n⚠️ Warning: Deleting folders will also delete all their contents!`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteItems(selectedItems);
        setShowContextMenu(false);
      } catch (error) {
        // Error already handled by store
      }
    }
  };

  const handleDeleteSingle = async (item) => {
    const isFolder = item.type === 'folder';
    let confirmMessage = `Are you sure you want to delete "${item.name}"?`;
    if (isFolder) {
      confirmMessage += '\n\n⚠️ Warning: This will also delete all files and folders inside it!';
    }

    if (window.confirm(confirmMessage)) {
      try {
        await deleteItems([item.id]);
        setShowContextMenu(false);
      } catch (error) {
        // Error already handled by store
      }
    }
  };

  const handleUploadClick = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const currentFolderId = currentPath[currentPath.length - 1].id;
        await uploadFile(file, currentFolderId);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        // Error already handled by store
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const currentFolderId = currentPath[currentPath.length - 1].id;
      for (const file of files) {
        try {
          await uploadFile(file, currentFolderId);
        } catch (error) {
          // Error already handled by store
        }
      }
    }
  };

  const getFileIcon = (file) => {
    // Extract extension from file name
    const extension = file.name?.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FaFile className="text-danger" size={48} />;
      case 'doc':
      case 'docx':
        return <FaFile className="text-primary" size={48} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FaFile className="text-success" size={48} />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FaFile className="text-warning" size={48} />;
      case 'mp3':
      case 'wav':
        return <FaFile className="text-info" size={48} />;
      default:
        return <FaFile className="text-secondary" size={48} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-browser h-100 d-flex flex-column">
      {/* Header */}
      <motion.div 
        className="d-flex justify-content-between align-items-center p-4 border-bottom bg-gradient-light shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="d-flex align-items-center">
          <motion.div
            className="d-flex align-items-center me-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <FaFolder className="text-primary me-2" size={20} />
            <h5 className="mb-0 fw-bold">File Browser</h5>
          </motion.div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              {breadcrumbs.map((crumb, index) => (
                <motion.li 
                  key={index} 
                  className="breadcrumb-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (index * 0.1) }}
                >
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-primary fw-bold">{crumb.name}</span>
                  ) : (
                    <motion.button 
                      className="btn btn-link p-0 text-decoration-none text-muted"
                      onClick={() => navigateToBreadcrumb(crumb, index)}
                      whileHover={{ scale: 1.05, color: '#007bff' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {crumb.name}
                    </motion.button>
                  )}
                </motion.li>
              ))}
            </ol>
          </nav>
        </div>

        <motion.div 
          className="d-flex align-items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* User Presence Indicator */}
          <UserPresence 
            activeUsers={activeUsers}
            folderViewers={folderViewers}
            isConnected={isConnected}
          />

          <div className="vr" style={{ height: '30px' }}></div>
          <motion.button
            className="btn btn-outline-primary shadow-sm d-flex align-items-center gap-2"
            onClick={() => setShowAdvancedSearch(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ minWidth: '280px' }}
          >
            <FaSearch className="text-muted" />
            <span className="text-muted">Search files and folders...</span>
          </motion.button>

          <div className="btn-group shadow-sm" role="group">
            <motion.button
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('grid')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaTh />
            </motion.button>
            <motion.button
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('list')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaList />
            </motion.button>
          </div>

          <div className="dropdown">
            <motion.button
              className="btn btn-outline-secondary dropdown-toggle shadow-sm"
              data-bs-toggle="dropdown"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaSort className="me-1" />
              Sort
            </motion.button>
            <ul className="dropdown-menu shadow-lg">
              <li>
                <button 
                  className="dropdown-item d-flex justify-content-between align-items-center"
                  onClick={() => setSortBy('name')}
                >
                  <span>Name</span>
                  {sortBy === 'name' && (
                    <span className="text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item d-flex justify-content-between align-items-center"
                  onClick={() => setSortBy('size')}
                >
                  <span>Size</span>
                  {sortBy === 'size' && (
                    <span className="text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item d-flex justify-content-between align-items-center"
                  onClick={() => setSortBy('date')}
                >
                  <span>Date</span>
                  {sortBy === 'date' && (
                    <span className="text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button 
                  className="dropdown-item"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
                </button>
              </li>
            </ul>
          </div>

          <motion.button
            className="btn btn-primary shadow-sm"
            onClick={() => setShowCreateFolder(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPlus className="me-1" />
            New Folder
          </motion.button>

          <motion.button 
            className="btn btn-success shadow-sm"
            onClick={handleUploadClick}
            disabled={isUploading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isUploading ? (
              <>
                <FaSpinner className="fa-spin me-1" />
                Uploading...
              </>
            ) : (
              <>
                <FaUpload className="me-1" />
                Upload
              </>
            )}
          </motion.button>

          {/* Delete Button - Shows when items are selected */}
          {selectedItems.length > 0 && (
            <motion.div
              className="position-fixed bottom-0 start-50 translate-middle-x mb-4 bg-white rounded-pill shadow-lg p-3 d-flex align-items-center gap-3"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              style={{ zIndex: 1000 }}
            >
              <span className="fw-bold text-dark">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
              </span>
              <div className="vr"></div>
              <motion.button
                className="btn btn-sm btn-outline-secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedItems([])}
                aria-label="Deselect all"
              >
                Clear
              </motion.button>
              <motion.button
                className="btn btn-sm btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Download selected items"
              >
                <FaDownload className="me-1" />
                Download
              </motion.button>
              <motion.button
                className="btn btn-sm btn-danger"
                onClick={handleDeleteSelected}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Delete selected items"
              >
                <FaTrash className="me-1" />
                Delete
              </motion.button>
            </motion.div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="*/*"
          />
        </motion.div>
      </motion.div>

      {/* File Grid/List */}
      <div 
        className={`flex-grow-1 p-4 overflow-auto bg-light position-relative ${isDragging ? 'drag-active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <motion.div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{
              background: 'rgba(102, 126, 234, 0.1)',
              border: '3px dashed #667eea',
              zIndex: 1000,
              pointerEvents: 'none'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <FaUpload size={64} className="text-primary mb-3" />
              <h4 className="text-primary">Drop files here to upload</h4>
            </div>
          </motion.div>
        )}
        {/* Loading State */}
        {isLoading && (
          <div className="row g-4">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="col-lg-2 col-md-3 col-sm-4 col-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <div className="skeleton skeleton-avatar mx-auto mb-3"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text" style={{ width: '60%', margin: '0 auto' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <motion.div
            className="alert alert-danger mx-auto"
            style={{ maxWidth: '600px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h5 className="alert-heading">Error Loading Files</h5>
            <p className="mb-0">{error}</p>
            <hr />
            <button 
              className="btn btn-sm btn-outline-danger"
              onClick={() => fetchFiles(currentPath[currentPath.length - 1].id)}
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && currentItems.length === 0 && (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="empty-state-icon">
              <FaFolder />
            </div>
            <h3 className="empty-state-title">This folder is empty</h3>
            <p className="empty-state-description">
              Upload files or create folders to get started with your file management
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <motion.button 
                className="btn btn-primary"
                onClick={() => setShowCreateFolder(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaPlus className="me-2" />
                Create Folder
              </motion.button>
              <motion.button 
                className="btn btn-success"
                onClick={handleUploadClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaUpload className="me-2" />
                Upload File
              </motion.button>
            </div>
            <small className="text-muted mt-3 d-block">
              Tip: You can also drag and drop files here
            </small>
          </motion.div>
        )}

        {/* Files and Folders */}
        {!isLoading && !error && currentItems.length > 0 && (
          <AnimatePresence mode="popLayout">
            {viewMode === 'grid' ? (
            <div className="row g-4">
              {currentItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="col-lg-2 col-md-3 col-sm-4 col-6"
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ 
                    scale: 1.05,
                    y: -5,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className={`card h-100 cursor-pointer border-0 shadow-sm ${
                      selectedItems.includes(item.id) 
                        ? 'border-primary bg-primary bg-opacity-10' 
                        : 'bg-white'
                    }`}
                    onClick={(e) => handleItemSelect(item, e)}
                    onDoubleClick={() => handleItemClick(item)}
                    onContextMenu={(e) => handleContextMenu(item, e)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    whileHover={{ 
                      boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                      borderColor: '#007bff'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="card-body text-center p-4 position-relative">
                      <motion.div 
                        className="mb-3"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.type === 'folder' ? (
                          <FaFolder className="text-warning" size={48} />
                        ) : (
                          getFileIcon(item)
                        )}
                      </motion.div>
                      <h6 className="card-title text-truncate fw-bold" title={item.name}>
                        {item.name}
                      </h6>
                      {item.sharedBy && (
                        <div className="mb-1">
                          <span className="badge bg-info text-white" style={{ fontSize: '0.7rem' }}>
                            <FaUserFriends className="me-1" size={10} />
                            {item.sharedBy}
                          </span>
                        </div>
                      )}
                      <small className="text-muted">
                        {item.type === 'folder' ? 'Folder' : formatFileSize(item.size)}
                      </small>
                      
                      {/* Quick Delete Button - Shows on hover */}
                      {hoveredItem === item.id && (
                        <motion.button
                          className="btn btn-sm btn-danger position-absolute top-0 start-0 m-2"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSingle(item);
                          }}
                          title="Delete"
                        >
                          <FaTrash size={12} />
                        </motion.button>
                      )}

                      {/* Selection Checkmark */}
                      {selectedItems.includes(item.id) && (
                        <motion.div
                          className="position-absolute top-0 end-0 m-2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                               style={{ width: '24px', height: '24px' }}>
                            <FaCheck className="small" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Modified</th>
                    <th>Owner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item) => (
                    <motion.tr
                      key={item.id}
                      className={selectedItems.includes(item.id) ? 'table-primary' : ''}
                      onClick={(e) => handleItemSelect(item, e)}
                      onDoubleClick={() => handleItemClick(item)}
                      onContextMenu={(e) => handleContextMenu(item, e)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ backgroundColor: 'rgba(0,123,255,0.1)' }}
                    >
                      <td>
                        <div className="d-flex align-items-center">
                          <span className="me-2">
                            {item.type === 'folder' ? (
                              <FaFolder className="text-warning" />
                            ) : (
                              getFileIcon(item)
                            )}
                          </span>
                          {item.name}
                          {item.sharedBy && (
                            <span className="badge bg-info text-white ms-2" style={{ fontSize: '0.65rem' }}>
                              <FaUserFriends className="me-1" size={8} />
                              {item.sharedBy}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{item.type === 'folder' ? '-' : formatFileSize(item.size)}</td>
                      <td>{new Date(item.updatedAt).toLocaleDateString()}</td>
                      <td>{item.userId?.substring(0, 8) || 'Unknown'}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            title="Download"
                          >
                            <FaDownload />
                          </button>
                          {item.type === 'file' && (
                            <button 
                              className="btn btn-outline-info btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVersionFile(item);
                                setShowVersionHistory(true);
                              }}
                              title="Version History"
                            >
                              <FaHistory />
                            </button>
                          )}
                          {item.type === 'folder' && (
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareFolder(item);
                                setShowShareModal(true);
                              }}
                              title="Share Folder"
                            >
                              <FaShare />
                            </button>
                          )}
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingle(item);
                            }}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </AnimatePresence>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Folder</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateFolder(false)}
                />
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateFolder(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="position-fixed bg-white border shadow rounded"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            zIndex: 1050,
            minWidth: '150px'
          }}
          onClick={() => setShowContextMenu(false)}
        >
          <div className="list-group list-group-flush">
            <button className="list-group-item list-group-item-action">
              <FaDownload className="me-2" />
              Download
            </button>
            {contextMenuItem?.type === 'file' && (
              <button 
                className="list-group-item list-group-item-action"
                onClick={() => {
                  setVersionFile(contextMenuItem);
                  setShowVersionHistory(true);
                }}
              >
                <FaHistory className="me-2" />
                Version History
              </button>
            )}
            {contextMenuItem?.type === 'folder' && (
              <button 
                className="list-group-item list-group-item-action"
                onClick={() => {
                  setShareFolder(contextMenuItem);
                  setShowShareModal(true);
                }}
              >
                <FaShare className="me-2" />
                Share Folder
              </button>
            )}
            <button className="list-group-item list-group-item-action">
              <FaCopy className="me-2" />
              Copy
            </button>
            <button className="list-group-item list-group-item-action">
              <FaEdit className="me-2" />
              Rename
            </button>
            <button 
              className="list-group-item list-group-item-action text-danger"
              onClick={() => contextMenuItem && handleDeleteSingle(contextMenuItem)}
            >
              <FaTrash className="me-2" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && versionFile && (
        <FileVersionHistory
          file={versionFile}
          onClose={() => {
            setShowVersionHistory(false);
            setVersionFile(null);
          }}
          onRestore={() => {
            // Refresh files after restore
            const currentFolderId = currentPath[currentPath.length - 1]?.id;
            fetchFiles(currentFolderId);
          }}
        />
      )}

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <AdvancedSearch
          onSelectFile={(file) => {
            if (file.type === 'folder') {
              navigateToFolder(file);
            }
            setShowAdvancedSearch(false);
          }}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}

      {/* Share Folder Modal */}
      {showShareModal && shareFolder && (
        <ShareFolderModal
          folder={shareFolder}
          onClose={() => {
            setShowShareModal(false);
            setShareFolder(null);
          }}
          onUpdate={() => {
            // Refresh files after sharing update
            const currentFolderId = currentPath[currentPath.length - 1]?.id;
            fetchFiles(currentFolderId);
          }}
        />
      )}
    </div>
  );
};

export default FileBrowser;
