import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaFile,
  FaFolder,
  FaImage,
  FaVideo,
  FaMusic,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaCalendar,
  FaUser,
  FaClock,
  FaDownload,
  FaHistory
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const AdvancedSearch = ({ onSelectFile, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stats, setStats] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    type: '',
    mimeType: '',
    dateFrom: '',
    dateTo: '',
    owner: '',
    folder: '',
    minSize: '',
    maxSize: ''
  });

  const searchInputRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    fetchRecentSearches();
    fetchStats();
  }, []);

  // Auto-complete with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length >= 2) {
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const fetchSuggestions = async (query) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/search/autocomplete?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data);
        setShowSuggestions(data.data.length > 0);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };

  const fetchRecentSearches = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/search/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setRecentSearches(data.data);
      }
    } catch (error) {
      console.error('Recent searches error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/search/stats/types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim() && !Object.values(filters).some(f => f)) {
      toast.error('Please enter a search query or apply filters');
      return;
    }

    setLoading(true);
    setShowSuggestions(false);

    try {
      const token = localStorage.getItem('auth_token');
      
      const params = new URLSearchParams({
        q: query,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v)
        )
      });

      const response = await fetch(`${API_URL}/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        if (data.data.length === 0) {
          toast.info('No results found');
        }
      } else {
        toast.error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      mimeType: '',
      dateFrom: '',
      dateTo: '',
      owner: '',
      folder: '',
      minSize: '',
      maxSize: ''
    });
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    handleSearch(suggestion.name);
  };

  const handleRecentSearchClick = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const getFileIcon = (item) => {
    if (item.type === 'folder') return <FaFolder className="text-warning" />;
    
    const mime = item.mimeType || '';
    if (mime.startsWith('image/')) return <FaImage className="text-info" />;
    if (mime.startsWith('video/')) return <FaVideo className="text-danger" />;
    if (mime.startsWith('audio/')) return <FaMusic className="text-success" />;
    if (mime.includes('pdf')) return <FaFilePdf className="text-danger" />;
    if (mime.includes('word')) return <FaFileWord className="text-primary" />;
    if (mime.includes('excel') || mime.includes('spreadsheet')) return <FaFileExcel className="text-success" />;
    
    return <FaFile className="text-secondary" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const activeFilterCount = Object.values(filters).filter(f => f).length;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <motion.div
          className="modal-content"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="modal-header">
            <h5 className="modal-title">
              <FaSearch className="me-2" />
              Advanced Search
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Search Bar */}
            <div className="mb-4 position-relative">
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-white">
                  <FaSearch className="text-muted" />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleSearch()}
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
                <button
                  className={`btn ${showFilters ? 'btn-success' : 'btn-outline-secondary'} position-relative`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FaFilter />
                  {activeFilterCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Auto-complete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  className="position-absolute w-100 bg-white border shadow-lg rounded mt-1"
                  style={{ zIndex: 1000 }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="list-group list-group-flush">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="list-group-item list-group-item-action d-flex align-items-center"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.type === 'folder' ? (
                          <FaFolder className="text-warning me-2" />
                        ) : (
                          <FaFile className="text-secondary me-2" />
                        )}
                        <span>{suggestion.name}</span>
                        <small className="ms-auto text-muted">
                          {suggestion.matchCount} match{suggestion.matchCount !== 1 ? 'es' : ''}
                        </small>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Recent Searches */}
            {!searchQuery && recentSearches.length > 0 && (
              <div className="mb-3">
                <small className="text-muted d-flex align-items-center mb-2">
                  <FaClock className="me-1" />
                  Recent Searches
                </small>
                <div className="d-flex flex-wrap gap-2">
                  {recentSearches.map((query, index) => (
                    <button
                      key={index}
                      className="btn btn-sm btn-outline-secondary rounded-pill"
                      onClick={() => handleRecentSearchClick(query)}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  className="card mb-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Filters</h6>
                      <button className="btn btn-sm btn-link" onClick={clearFilters}>
                        Clear All
                      </button>
                    </div>
                    
                    <div className="row g-3">
                      {/* File Type */}
                      <div className="col-md-3">
                        <label className="form-label">Type</label>
                        <select
                          className="form-select"
                          value={filters.type}
                          onChange={(e) => handleFilterChange('type', e.target.value)}
                        >
                          <option value="">All Types</option>
                          <option value="file">Files Only</option>
                          <option value="folder">Folders Only</option>
                        </select>
                      </div>

                      {/* MIME Type */}
                      <div className="col-md-3">
                        <label className="form-label">Category</label>
                        <select
                          className="form-select"
                          value={filters.mimeType}
                          onChange={(e) => handleFilterChange('mimeType', e.target.value)}
                        >
                          <option value="">All Categories</option>
                          <option value="image">Images</option>
                          <option value="video">Videos</option>
                          <option value="audio">Audio</option>
                          <option value="pdf">PDF</option>
                          <option value="word">Documents</option>
                          <option value="excel">Spreadsheets</option>
                          <option value="text">Text Files</option>
                        </select>
                      </div>

                      {/* Date From */}
                      <div className="col-md-3">
                        <label className="form-label">From Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        />
                      </div>

                      {/* Date To */}
                      <div className="col-md-3">
                        <label className="form-label">To Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        />
                      </div>

                      {/* Min Size */}
                      <div className="col-md-3">
                        <label className="form-label">Min Size (KB)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          value={filters.minSize}
                          onChange={(e) => handleFilterChange('minSize', e.target.value ? e.target.value * 1024 : '')}
                        />
                      </div>

                      {/* Max Size */}
                      <div className="col-md-3">
                        <label className="form-label">Max Size (KB)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Unlimited"
                          value={filters.maxSize}
                          onChange={(e) => handleFilterChange('maxSize', e.target.value ? e.target.value * 1024 : '')}
                        />
                      </div>

                      {/* Folder */}
                      <div className="col-md-3">
                        <label className="form-label">Location</label>
                        <select
                          className="form-select"
                          value={filters.folder}
                          onChange={(e) => handleFilterChange('folder', e.target.value)}
                        >
                          <option value="">All Locations</option>
                          <option value="root">Root Folder</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Statistics */}
            {stats.length > 0 && !searchQuery && results.length === 0 && (
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <h6 className="text-muted">Your Files</h6>
                </div>
                {stats.map((stat, index) => (
                  <div key={index} className="col-md-3">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <h3 className="mb-0">{stat.count}</h3>
                        <small className="text-muted">{stat.category}</small>
                        {stat.totalSize > 0 && (
                          <div className="mt-2">
                            <small className="text-muted">{formatFileSize(stat.totalSize)}</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search Results */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="list-group">
                  {results.map((item) => (
                    <motion.div
                      key={item.id}
                      className="list-group-item list-group-item-action"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ backgroundColor: 'rgba(0,123,255,0.05)' }}
                      onClick={() => onSelectFile && onSelectFile(item)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center flex-grow-1">
                          <div className="me-3" style={{ fontSize: '24px' }}>
                            {getFileIcon(item)}
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{item.name}</h6>
                            <div className="d-flex gap-3">
                              {item.type === 'file' && (
                                <small className="text-muted">
                                  <strong>Size:</strong> {formatFileSize(item.size)}
                                </small>
                              )}
                              <small className="text-muted">
                                <FaCalendar className="me-1" size={12} />
                                {formatDate(item.updatedAt)}
                              </small>
                              {item.ownerName && (
                                <small className="text-muted">
                                  <FaUser className="me-1" size={12} />
                                  {item.ownerName}
                                </small>
                              )}
                              {item.folderPath && (
                                <small className="text-muted">
                                  <FaFolder className="me-1" size={12} />
                                  {item.folderPath}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" title="Download">
                            <FaDownload />
                          </button>
                          {item.type === 'file' && (
                            <button className="btn btn-outline-info" title="Version History">
                              <FaHistory />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : searchQuery || activeFilterCount > 0 ? (
                <div className="text-center text-muted py-5">
                  <FaSearch size={48} className="mb-3 opacity-25" />
                  <p>No results found</p>
                  <small>Try adjusting your search or filters</small>
                </div>
              ) : null}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
