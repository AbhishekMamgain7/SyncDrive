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
  FaCheck
} from 'react-icons/fa';
import useFileStore from '../../store/fileStore';

const FileBrowser = () => {
  const {
    files,
    folders,
    currentPath,
    selectedItems,
    searchQuery,
    viewMode,
    sortBy,
    sortOrder,
    setCurrentPath,
    setSelectedItems,
    setSearchQuery,
    setViewMode,
    setSortBy,
    setSortOrder,
    createFolder,
    deleteItems,
    renameItem,
    getCurrentItems,
    getBreadcrumbs,
    initializeData
  } = useFileStore();

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuItem, setContextMenuItem] = useState(null);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const currentItems = getCurrentItems();
  const breadcrumbs = getBreadcrumbs();

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
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

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim(), currentPath);
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  const handleDelete = () => {
    if (selectedItems.length > 0) {
      deleteItems(selectedItems);
      setShowContextMenu(false);
    }
  };

  const getFileIcon = (file) => {
    const extension = file.extension?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FaFile className="text-danger" />;
      case 'doc':
      case 'docx':
        return <FaFile className="text-primary" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FaFile className="text-success" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FaFile className="text-warning" />;
      case 'mp3':
      case 'wav':
        return <FaFile className="text-info" />;
      default:
        return <FaFile className="text-secondary" />;
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
                      onClick={() => setCurrentPath(crumb.path)}
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaUpload className="me-1" />
            Upload
          </motion.button>
        </motion.div>
      </motion.div>

      {/* File Grid/List */}
      <div className="flex-grow-1 p-4 overflow-auto bg-light">
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
                    whileHover={{ 
                      boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                      borderColor: '#007bff'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="card-body text-center p-4">
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
                      <td>{formatFileSize(item.size)}</td>
                      <td>{new Date(item.modifiedAt).toLocaleDateString()}</td>
                      <td>{item.owner}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-secondary btn-sm">
                            <FaDownload />
                          </button>
                          <button className="btn btn-outline-secondary btn-sm">
                            <FaShare />
                          </button>
                          <button className="btn btn-outline-secondary btn-sm">
                            <FaEllipsisV />
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

        {currentItems.length === 0 && (
          <motion.div
            className="text-center py-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FaFolder size={64} className="text-muted mb-3" />
            <h5 className="text-muted">No files or folders</h5>
            <p className="text-muted">Upload files or create folders to get started</p>
          </motion.div>
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
              onClick={handleDelete}
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
