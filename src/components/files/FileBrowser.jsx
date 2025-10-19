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
  FaSpinner
} from 'react-icons/fa';
import useFileStore from '../../store/fileStore';

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
  const fileInputRef = React.useRef(null);

  // Load root directory on mount
  useEffect(() => {
    fetchFiles(null);
  }, []);

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
          <div className="input-group shadow-sm" style={{ width: '280px' }}>
            <span className="input-group-text bg-white border-end-0">
              <FaSearch className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ boxShadow: 'none' }}
            />
          </div>

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
            <motion.button 
              className="btn btn-danger shadow-sm"
              onClick={handleDeleteSelected}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaTrash className="me-1" />
              Delete ({selectedItems.length})
            </motion.button>
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
      <div className="flex-grow-1 p-4 overflow-auto bg-light">
        {/* Loading State */}
        {isLoading && (
          <div className="d-flex justify-content-center align-items-center py-5">
            <FaSpinner className="fa-spin text-primary me-2" size={24} />
            <span className="text-muted">Loading files...</span>
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
            className="text-center py-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FaFolder size={64} className="text-muted mb-3" />
            <h5 className="text-muted">This folder is empty</h5>
            <p className="text-muted">Upload files or create folders to get started</p>
            <button 
              className="btn btn-primary mt-3"
              onClick={() => setShowCreateFolder(true)}
            >
              <FaPlus className="me-2" />
              Create Folder
            </button>
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
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            title="Share"
                          >
                            <FaShare />
                          </button>
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
            <button className="list-group-item list-group-item-action">
              <FaShare className="me-2" />
              Share
            </button>
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
    </div>
  );
};

export default FileBrowser;
