# Frontend Integration Guide - FileBrowser with Backend API

## ✅ Changes Made

### 1. **Updated Dependencies**
- ✅ Added `axios` for API calls

### 2. **Refactored Zustand Store** (`src/store/fileStore.js`)
**Removed:**
- Mock data initialization
- Local file/folder arrays
- Path-based navigation system

**Added:**
- `isLoading: false` - Loading state indicator
- `error: null` - Error message storage
- `currentPath: [{ id: null, name: 'Home' }]` - Breadcrumb trail array
- `fetchFiles(parentId)` - Async function to fetch from API
- `navigateToFolder(folder)` - Navigate into a folder and fetch its contents
- `navigateToBreadcrumb(pathItem, index)` - Navigate back via breadcrumbs
- `getFilteredAndSortedFiles()` - Client-side filtering and sorting
- API-integrated CRUD operations (create, delete, rename)

### 3. **Enhanced FileBrowser Component** (`src/components/files/FileBrowser.jsx`)
**Key Features:**
- ✅ Loads root directory on mount with `useEffect`
- ✅ Loading spinner during API calls
- ✅ Error state with retry button
- ✅ Empty state with helpful message
- ✅ Dynamic breadcrumb navigation
- ✅ Folder navigation by clicking
- ✅ Real-time UI updates after operations

**UI States:**
1. **Loading**: Shows spinner with "Loading files..." message
2. **Error**: Displays error alert with retry button
3. **Empty**: Shows "This folder is empty" with create folder button
4. **Content**: Displays files and folders in grid/list view

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
# In the root directory
npm install
```

This will install `axios` and all other dependencies.

### Step 2: Start the Backend Server
```bash
# Open a terminal in the server directory
cd server

# Make sure .env file exists with correct MySQL credentials
# Copy .env.example to .env if needed
cp .env.example .env

# Start the server
npm run dev
```

**Expected Output:**
```
Server listening on http://localhost:4000
✓ Database initialized
✓ Users table ready
✓ Files table ready
```

### Step 3: Test the Backend API (Optional but Recommended)
```powershell
# In the root directory, run the test script
.\test-api.ps1
```

This will:
- Create a test user
- Generate an auth token
- Create sample folders
- Test all CRUD operations
- Display the token for manual testing

### Step 4: Start the Frontend
```bash
# Open a new terminal in the root directory
npm run dev
```

The app will start on `http://localhost:5173`

---

## 🧪 Testing the Integration

### Test Scenario 1: First Login
1. Open `http://localhost:5173`
2. Click "Sign Up"
3. Enter credentials:
   - Name: John Doe
   - Email: john@example.com
   - Password: password123
4. Click "Create account"
5. You should be redirected to the file browser
6. **Expected**: Empty folder message with "Create Folder" button

### Test Scenario 2: Create Folders
1. Click "New Folder" button
2. Enter folder name: "Documents"
3. Click "Create"
4. **Expected**: 
   - Success toast notification
   - Folder appears in the grid/list
   - No page refresh needed

### Test Scenario 3: Navigate into Folder
1. Double-click the "Documents" folder
2. **Expected**:
   - Loading spinner appears briefly
   - Breadcrumb shows: Home > Documents
   - Empty folder message (since it's new)

### Test Scenario 4: Create Subfolder
1. While inside Documents folder
2. Click "New Folder"
3. Enter name: "Work Projects"
4. **Expected**:
   - Folder created inside Documents
   - URL stays the same (no page reload)
   - New folder appears

### Test Scenario 5: Breadcrumb Navigation
1. Click "Home" in the breadcrumb
2. **Expected**:
   - Navigates back to root
   - Shows all root folders
   - Loading indicator during fetch

### Test Scenario 6: Delete Items
1. Right-click on a folder
2. Select "Delete"
3. Confirm the deletion
4. **Expected**:
   - Confirmation dialog appears
   - Item removed from view
   - Success toast notification

---

## 🔍 How It Works

### Data Flow Diagram
```
Component Mount
    ↓
fetchFiles(null) called
    ↓
API Request: GET /api/files
    ↓
Store updates: files[], isLoading=false
    ↓
Component re-renders with data
    ↓
User clicks folder
    ↓
navigateToFolder() called
    ↓
- Updates currentPath breadcrumb
- Calls fetchFiles(folderId)
    ↓
API Request: GET /api/files?parentId=X
    ↓
Store updates with new files
    ↓
Component shows folder contents
```

### State Management Flow
```javascript
// Initial State
{
  files: [],
  isLoading: false,
  error: null,
  currentPath: [{ id: null, name: 'Home' }],
  selectedItems: [],
  // ... other UI state
}

// During API Call
{
  files: [...],
  isLoading: true,  // ← Shows spinner
  error: null,
  // ...
}

// After Success
{
  files: [...new data],
  isLoading: false,  // ← Hides spinner
  error: null,
  // ...
}

// After Error
{
  files: [],
  isLoading: false,
  error: "Failed to load files",  // ← Shows error alert
  // ...
}
```

---

## 🎨 UI Features

### Loading States
```jsx
{isLoading && (
  <FaSpinner className="fa-spin" />
  <span>Loading files...</span>
)}
```

### Error Handling
```jsx
{error && !isLoading && (
  <div className="alert alert-danger">
    <h5>Error Loading Files</h5>
    <p>{error}</p>
    <button onClick={() => fetchFiles(currentFolderId)}>
      Try Again
    </button>
  </div>
)}
```

### Empty State
```jsx
{!isLoading && !error && items.length === 0 && (
  <div className="text-center">
    <FaFolder size={64} />
    <h5>This folder is empty</h5>
    <button onClick={createFolder}>Create Folder</button>
  </div>
)}
```

---

## 🔐 Authentication Flow

### Token Storage
When a user logs in or signs up:
```javascript
// In AuthContext.jsx
localStorage.setItem('auth_token', data.token);
localStorage.setItem('auth_user', JSON.stringify(user));
```

### Token Usage
Every API request includes the token:
```javascript
// In fileStore.js
const getAuthConfig = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
});

axios.get('/api/files', getAuthConfig());
```

### Token Expiration
If token expires (401/403 error):
- User is automatically logged out
- Redirected to login page
- Error message displayed

---

## 📝 API Integration Details

### GET /api/files
**Purpose**: Fetch files and folders

**Parameters**:
- `parentId` (optional): ID of parent folder, null for root

**Request**:
```javascript
const response = await axios.get(
  parentId ? `/api/files?parentId=${parentId}` : '/api/files',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Documents",
      "type": "folder",
      "parentId": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "count": 1
}
```

### POST /api/files/folder
**Purpose**: Create a new folder

**Request Body**:
```json
{
  "name": "New Folder",
  "parentId": null
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "New Folder",
    "type": "folder",
    "parentId": null,
    // ...
  }
}
```

### DELETE /api/files/:id
**Purpose**: Delete a file or folder

**Request**:
```javascript
await axios.delete(`/api/files/${id}`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Response**:
```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

---

## 🐛 Troubleshooting

### Issue: "Access token required" Error
**Cause**: No token in localStorage or invalid format

**Solution**:
1. Check browser localStorage: `localStorage.getItem('auth_token')`
2. Log out and log in again
3. Check if token format is `Bearer <token>`

### Issue: Empty screen after login
**Cause**: API not responding or wrong URL

**Solution**:
1. Check if backend server is running on port 4000
2. Check browser console for errors
3. Verify Vite proxy configuration in `vite.config.js`

### Issue: "Failed to fetch files" Error
**Cause**: MySQL not running or connection error

**Solution**:
1. Start MySQL service
2. Check `.env` credentials in server folder
3. Verify database `syncdrive` exists

### Issue: Folders not appearing after creation
**Cause**: API call succeeded but UI not updating

**Solution**:
1. Check browser network tab for API response
2. Verify `fetchFiles` is called after create operation
3. Check store state in React DevTools

### Issue: CORS errors in browser console
**Cause**: Frontend and backend on different origins

**Solution**:
1. Ensure frontend runs on `http://localhost:5173`
2. Ensure backend runs on `http://localhost:4000`
3. Check CORS settings in `server/src/index.js`

---

## 🎯 Next Steps

### Immediate Testing
1. ✅ Install dependencies: `npm install`
2. ✅ Start backend: `cd server && npm run dev`
3. ✅ Test API: `.\test-api.ps1`
4. ✅ Start frontend: `npm run dev`
5. ✅ Sign up and test file browser

### Future Enhancements
- [ ] File upload functionality
- [ ] File download
- [ ] Drag & drop file organization
- [ ] Share files with other users
- [ ] File preview
- [ ] Search functionality
- [ ] Bulk operations (select multiple items)

---

## 📊 Architecture Summary

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│  ┌─────────────────────────────────────────┐   │
│  │         FileBrowser Component            │   │
│  │  - UI rendering                          │   │
│  │  - User interactions                     │   │
│  │  - Loading/Error states                  │   │
│  └──────────────┬──────────────────────────┘   │
│                 │                                │
│  ┌──────────────▼──────────────────────────┐   │
│  │         Zustand Store (fileStore)        │   │
│  │  - State management                      │   │
│  │  - API calls with axios                  │   │
│  │  - Error handling                        │   │
│  │  - Breadcrumb management                 │   │
│  └──────────────┬──────────────────────────┘   │
└─────────────────┼──────────────────────────────┘
                  │ HTTP + JWT
┌─────────────────▼──────────────────────────────┐
│              Express Backend API                │
│  ┌─────────────────────────────────────────┐   │
│  │         Files Router (/api/files)        │   │
│  │  - GET /api/files (list)                 │   │
│  │  - POST /api/files/folder (create)       │   │
│  │  - DELETE /api/files/:id                 │   │
│  │  - PATCH /api/files/:id (rename)         │   │
│  └──────────────┬──────────────────────────┘   │
│                 │                                │
│  ┌──────────────▼──────────────────────────┐   │
│  │       File Controller + Middleware       │   │
│  │  - JWT authentication                    │   │
│  │  - Business logic                        │   │
│  │  - Validation                            │   │
│  └──────────────┬──────────────────────────┘   │
└─────────────────┼──────────────────────────────┘
                  │ SQL Queries
┌─────────────────▼──────────────────────────────┐
│                MySQL Database                   │
│  ┌─────────────────────────────────────────┐   │
│  │         users table                      │   │
│  │  - id, name, email, password_hash        │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │         files table                      │   │
│  │  - id, name, type, user_id, parent_id    │   │
│  │  - Foreign keys & indexes                │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

**Ready to test!** Start both servers and enjoy your fully integrated file management system. 🎉
