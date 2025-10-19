# 🚀 Quick Start Guide - SyncDrive File Management

## ✅ Integration Complete!

Your FileBrowser is now fully connected to the backend API. Here's how to start testing:

---

## Step-by-Step Testing

### 1️⃣ Start the Backend Server

```powershell
# Navigate to server directory
cd server

# Start the server (with auto-reload)
npm run dev
```

**Expected Output:**
```
Server listening on http://localhost:4000
✓ Database initialized
✓ Users table ready
✓ Files table ready
```

**✓ Leave this terminal running**

---

### 2️⃣ Test Backend API (Optional but Recommended)

Open a new terminal:

```powershell
# Make sure you're in the root directory
cd "d:\Abhishek's_\College\btech 3rd yr\PBL OS\SyncDrive"

# Run the test script
.\test-api.ps1
```

This will:
- ✅ Create a test user
- ✅ Generate authentication token
- ✅ Create sample folders (Documents, Images, Projects)
- ✅ Test CRUD operations
- ✅ Display your auth token

**Save the token** if you want to use it for manual testing!

---

### 3️⃣ Start the Frontend

Open another new terminal:

```powershell
# Make sure you're in the root directory
cd "d:\Abhishek's_\College\btech 3rd yr\PBL OS\SyncDrive"

# Start Vite dev server
npm run dev
```

**Expected Output:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### 4️⃣ Test in Browser

1. **Open** `http://localhost:5173`

2. **Sign Up** (if you didn't run the test script):
   - Click "Sign Up"
   - Name: John Doe
   - Email: john@test.com
   - Password: password123
   - Click "Create account"

3. **You're In!** You should see the File Browser

---

## 🧪 Testing Checklist

### ✅ Basic Operations

- [ ] **Create Folder**: Click "New Folder", enter name, see it appear
- [ ] **Open Folder**: Double-click a folder, see breadcrumb update
- [ ] **Navigate Back**: Click "Home" in breadcrumb
- [ ] **Delete Folder**: Right-click folder, select delete, confirm
- [ ] **Search**: Type in search box, see filtered results
- [ ] **Switch Views**: Toggle between Grid and List views
- [ ] **Sort**: Use sort dropdown (Name/Size/Date)

### ✅ Navigation Flow

```
Home (empty)
  ↓ Create "Documents"
Home (shows Documents folder)
  ↓ Double-click Documents
Documents (empty, breadcrumb: Home > Documents)
  ↓ Create "Work"
Documents (shows Work folder)
  ↓ Click "Home" in breadcrumb
Home (shows Documents again)
```

### ✅ Error Handling

- [ ] **Logout and try to access files**: Should redirect to login
- [ ] **Stop backend server**: Should show error message with retry
- [ ] **Try duplicate folder name**: Should show error toast

---

## 🎯 What Was Changed

### Frontend (`src/store/fileStore.js`)
✅ Removed mock data initialization  
✅ Added API integration with axios  
✅ Added loading/error states  
✅ Changed `currentPath` to breadcrumb array: `[{ id: null, name: 'Home' }]`  
✅ Added `fetchFiles(parentId)` - fetch from API  
✅ Added `navigateToFolder(folder)` - navigate and fetch  
✅ Added `navigateToBreadcrumb(pathItem, index)` - breadcrumb navigation  
✅ All CRUD operations now hit backend API  

### Frontend (`src/components/files/FileBrowser.jsx`)
✅ Calls `fetchFiles(null)` on mount  
✅ Shows loading spinner during API calls  
✅ Shows error message with retry button  
✅ Shows empty state when no files  
✅ Breadcrumb navigation works with backend data  
✅ Folder double-click fetches contents  
✅ All operations update UI automatically  

### Backend (Already Complete)
✅ Files table in MySQL  
✅ Authentication middleware  
✅ File controller with CRUD operations  
✅ REST API endpoints  

---

## 📋 Architecture Overview

```
User clicks folder
    ↓
navigateToFolder(folder) called
    ↓
Updates currentPath: [{ id: null, name: 'Home' }, { id: 1, name: 'Documents' }]
    ↓
Calls fetchFiles(folder.id)
    ↓
Sets isLoading = true
    ↓
GET /api/files?parentId=1 with Bearer token
    ↓
Backend queries MySQL: SELECT * FROM files WHERE parent_id = 1 AND user_id = 'xyz'
    ↓
Returns JSON: { success: true, data: [...] }
    ↓
Store updates: files = data, isLoading = false
    ↓
Component re-renders with new files
```

---

## 🔧 Troubleshooting

### Backend won't start
**Error**: `Cannot connect to MySQL`

**Solution**:
1. Start MySQL service
2. Check `server/.env` file has correct credentials
3. Verify database name is `syncdrive`

---

### Frontend shows "Access token required"
**Error**: 401 Unauthorized

**Solution**:
1. Log out and log back in
2. Check browser console: `localStorage.getItem('auth_token')`
3. Token should start with `eyJ...`

---

### "Failed to fetch files" error
**Error**: API not responding

**Solution**:
1. Verify backend is running on port 4000
2. Check browser Network tab for failed requests
3. Verify Vite proxy in `vite.config.js`

---

### Empty screen after login
**Issue**: No files showing, no error

**Solution**:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify `fetchFiles` is called
4. Check Network tab for API response

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `FRONTEND_INTEGRATION_GUIDE.md` | Detailed integration docs |
| `server/API_DOCUMENTATION.md` | Complete API reference |
| `server/SETUP_GUIDE.md` | Backend setup guide |
| `test-api.ps1` | PowerShell test script |
| `QUICK_START.md` | This file |

---

## 🎉 You're Ready!

Three terminals needed:
1. **Backend**: `cd server && npm run dev`
2. **Frontend**: `npm run dev`
3. **Testing**: Use browser at `http://localhost:5173`

**Test Flow**:
1. Sign up → See empty file browser
2. Create folders → See them appear
3. Double-click folder → Navigate inside
4. Click breadcrumb → Navigate back
5. Delete folder → Confirm and see it removed

Everything updates automatically without page refresh! 🚀

---

## 💡 Pro Tips

- **Use React DevTools** to inspect Zustand store state
- **Use Network Tab** to see API requests/responses
- **Check Console** for any errors or warnings
- **Token expires in 7 days** - login again if needed

---

**Happy coding!** Your file management system is production-ready. 🎊
