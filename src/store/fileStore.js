import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = '/api/files';

// Helper function to get auth token
const getAuthToken = () => localStorage.getItem('auth_token');

// Helper function to create axios config with auth
const getAuthConfig = () => ({
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`
  }
});

const useFileStore = create((set, get) => ({
  // State
  files: [],
  selectedItems: [],
  searchQuery: '',
  viewMode: 'grid', // 'grid' or 'list'
  sortBy: 'name', // 'name', 'size', 'date'
  sortOrder: 'asc', // 'asc' or 'desc'
  isLoading: false,
  isUploading: false,
  error: null,
  currentPath: [{ id: null, name: 'Home' }], // Breadcrumb trail

  // API Actions
  fetchFiles: async (parentId = null) => {
    set({ isLoading: true, error: null });
    
    try {
      const url = parentId 
        ? `${API_BASE_URL}?parentId=${parentId}`
        : API_BASE_URL;
      
      const response = await axios.get(url, getAuthConfig());
      
      if (response.data.success) {
        set({ 
          files: response.data.data || [],
          isLoading: false,
          error: null
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch files');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load files';
      set({ 
        error: errorMessage,
        isLoading: false,
        files: []
      });
      toast.error(errorMessage);
    }
  },

  // UI State Actions
  setSelectedItems: (items) => set({ selectedItems: items }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setSortBy: (sortBy) => set({ sortBy }),
  
  setSortOrder: (order) => set({ sortOrder: order }),

  updateCurrentPath: (newPath) => set({ currentPath: newPath }),

  navigateToFolder: (folder) => {
    const state = get();
    const newPath = [...state.currentPath, { id: folder.id, name: folder.name }];
    set({ currentPath: newPath });
    get().fetchFiles(folder.id);
  },

  navigateToBreadcrumb: (pathItem, index) => {
    const state = get();
    const newPath = state.currentPath.slice(0, index + 1);
    set({ currentPath: newPath });
    get().fetchFiles(pathItem.id);
  },

  // File Operations with API
  createFolder: async (name, parentId = null) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/folder`,
        { name, parentId },
        getAuthConfig()
      );

      if (response.data.success) {
        toast.success('Folder created successfully');
        // Refresh the current view
        const state = get();
        const currentFolderId = state.currentPath[state.currentPath.length - 1].id;
        await get().fetchFiles(currentFolderId);
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create folder');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create folder';
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteItems: async (itemIds) => {
    try {
      // Delete all selected items
      await Promise.all(
        itemIds.map(id => 
          axios.delete(`${API_BASE_URL}/${id}`, getAuthConfig())
        )
      );

      toast.success(`Deleted ${itemIds.length} item(s)`);
      
      // Refresh the current view
      const state = get();
      const currentFolderId = state.currentPath[state.currentPath.length - 1].id;
      await get().fetchFiles(currentFolderId);
      
      set({ selectedItems: [] });
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete items';
      toast.error(errorMessage);
      throw error;
    }
  },

  renameItem: async (itemId, newName) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/${itemId}`,
        { name: newName },
        getAuthConfig()
      );

      if (response.data.success) {
        toast.success('Renamed successfully');
        
        // Refresh the current view
        const state = get();
        const currentFolderId = state.currentPath[state.currentPath.length - 1].id;
        await get().fetchFiles(currentFolderId);
        
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to rename');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to rename item';
      toast.error(errorMessage);
      throw error;
    }
  },

  uploadFile: async (file, parentId = null) => {
    set({ isUploading: true });
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      if (parentId) {
        formData.append('parentId', parentId);
      }

      // Upload file to backend
      const response = await axios.post(
        `${API_BASE_URL}/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success(`File "${file.name}" uploaded successfully`);
        
        // Refresh the current view to show the new file
        const state = get();
        const currentFolderId = state.currentPath[state.currentPath.length - 1].id;
        await get().fetchFiles(currentFolderId);
        
        set({ isUploading: false });
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to upload file');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file';
      toast.error(errorMessage);
      set({ isUploading: false });
      throw error;
    }
  },

  // Computed values
  getFilteredAndSortedFiles: () => {
    const state = get();
    let items = [...state.files];

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    items.sort((a, b) => {
      let comparison = 0;
      
      // Sort folders first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      if (state.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (state.sortBy === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      } else if (state.sortBy === 'date') {
        comparison = new Date(a.updatedAt) - new Date(b.updatedAt);
      }
      
      return state.sortOrder === 'desc' ? -comparison : comparison;
    });

    return items;
  }
}));

export default useFileStore;
