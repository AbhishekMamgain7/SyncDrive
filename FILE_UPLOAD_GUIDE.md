# File Upload Implementation Guide

## ✅ Complete Implementation

File upload functionality has been successfully implemented in SyncDrive with both backend and frontend integration.

---

## 🎯 What Was Implemented

### **Backend (Server)**

#### 1. **Installed Multer** ✅
```bash
npm install multer
```
- Package for handling `multipart/form-data`
- Enables file upload processing

#### 2. **Created Upload Middleware** ✅
**File**: `server/src/middleware/upload.js`

**Features:**
- User-specific directories: `uploads/user_<userId>/`
- Automatic directory creation
- Original filename preservation with unique suffix
- File size limit: 100MB
- Disk storage configuration

**Storage Strategy:**
```javascript
uploads/
└── user_<userId>/
    ├── document-1234567890-123456789.pdf
    ├── image-1234567891-987654321.jpg
    └── ...
```

#### 3. **Updated .gitignore** ✅
Added `uploads/` directory to prevent committing user files.

#### 4. **Created Upload Controller** ✅
**File**: `server/src/controllers/fileController.js`
**Function**: `uploadFile()`

**Flow:**
1. Receives uploaded file from multer middleware
2. Extracts metadata (name, mimetype, size, path)
3. Checks for duplicate filenames
4. Saves metadata to `files` table
5. Returns file record with 201 status

#### 5. **Added Upload Route** ✅
**File**: `server/src/routes/files.js`
**Endpoint**: `POST /api/files/upload`

**Features:**
- Protected with JWT authentication
- Uses multer middleware
- Accepts single file with field name 'file'
- Optional parentId in request body

---

### **Frontend (React)**

#### 1. **Updated Zustand Store** ✅
**File**: `src/store/fileStore.js`

**Added State:**
```javascript
isUploading: false  // Upload progress indicator
```

**Added Action:**
```javascript
uploadFile(file, parentId)
```

**Functionality:**
- Creates FormData with file and parentId
- Sets uploading state
- Makes authenticated POST to `/api/files/upload`
- Refreshes file list after successful upload
- Shows success/error toasts
- Resets uploading state

#### 2. **Enhanced FileBrowser Component** ✅
**File**: `src/components/files/FileBrowser.jsx`

**Added:**
- Hidden file input with ref
- Upload button with loading state
- `handleUploadClick()` - Triggers file input
- `handleFileChange()` - Processes selected file

**UI Features:**
- Upload button shows "Uploading..." with spinner
- Button disabled during upload
- Automatic file list refresh after upload

---

## 🚀 How to Use

### **Step 1: Start Backend**
```powershell
cd server
npm run dev
```

The server will create the `uploads/` directory automatically.

### **Step 2: Start Frontend**
```powershell
# In root directory
npm run dev
```

### **Step 3: Test File Upload**

1. **Login/Signup** to the application
2. **Navigate** to desired folder (or stay in root)
3. **Click "Upload"** button
4. **Select a file** from your computer
5. **Watch**:
   - Button changes to "Uploading..." with spinner
   - Success toast appears
   - File appears in the list automatically
   - File is saved to `server/uploads/user_<userId>/`

---

## 📊 Upload Flow

### Complete Data Flow
```
User clicks Upload
    ↓
File input dialog opens
    ↓
User selects file
    ↓
handleFileChange() triggered
    ↓
uploadFile(file, parentId) called
    ↓
Creates FormData
    ↓
POST /api/files/upload with Bearer token
    ↓
Backend: authenticateToken middleware
    ↓
Backend: multer middleware
    ├─ Creates user directory
    ├─ Saves file to disk
    └─ Attaches file info to req.file
    ↓
Backend: uploadFile controller
    ├─ Checks for duplicates
    ├─ Inserts metadata to database
    └─ Returns file record
    ↓
Frontend: Receives response
    ├─ Shows success toast
    ├─ Calls fetchFiles()
    └─ Updates UI with new file
    ↓
User sees uploaded file
```

### Database Entry
```sql
INSERT INTO files (
  name,           -- Original filename
  type,           -- 'file'
  path,           -- Server path: uploads/user_xxx/file-xxx.ext
  size,           -- File size in bytes
  mime_type,      -- e.g., 'application/pdf'
  user_id,        -- User who uploaded
  parent_id       -- Folder ID or NULL
) VALUES (...)
```

---

## 🎨 UI States

### **Before Upload**
```jsx
<button>
  <FaUpload /> Upload
</button>
```

### **During Upload**
```jsx
<button disabled>
  <FaSpinner className="fa-spin" /> Uploading...
</button>
```

### **After Upload**
- Success toast: "File uploaded successfully"
- File appears in grid/list
- Button returns to normal state

---

## 🔐 Security Features

### **Backend Protection**
✅ JWT authentication required  
✅ User-specific directories (isolated storage)  
✅ File size limit (100MB)  
✅ Duplicate name detection  
✅ Automatic directory creation  
✅ Secure file path handling  

### **Frontend Validation**
✅ Authentication token checked  
✅ Single file upload enforced  
✅ Upload state managed  
✅ Error handling with user feedback  

---

## 🧪 Testing Scenarios

### **Test 1: Basic Upload**
1. Click Upload
2. Select a PDF file
3. **Expected**: File appears in list, success toast

### **Test 2: Upload to Subfolder**
1. Navigate into a folder
2. Click Upload
3. Select a file
4. **Expected**: File appears in subfolder, breadcrumb shows path

### **Test 3: Duplicate File**
1. Upload a file
2. Try uploading the same filename again
3. **Expected**: Error toast "A file with this name already exists"

### **Test 4: Large File**
1. Try uploading a file > 100MB
2. **Expected**: Error message about file size

### **Test 5: Multiple Files**
1. Upload a file while another is uploading
2. **Expected**: Button disabled until first upload completes

---

## 📁 File Structure

### Backend
```
server/
├── src/
│   ├── controllers/
│   │   └── fileController.js        ✓ uploadFile() added
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js                ✨ NEW
│   └── routes/
│       └── files.js                 ✓ POST /upload route
├── uploads/                          ✨ NEW (auto-created)
│   └── user_<userId>/               Auto-created per user
├── .gitignore                        ✓ uploads/ excluded
└── package.json                      ✓ multer added
```

### Frontend
```
src/
├── components/
│   └── files/
│       └── FileBrowser.jsx          ✓ Upload UI
└── store/
    └── fileStore.js                 ✓ uploadFile() action
```

---

## 🛠️ Configuration

### Multer Configuration (`server/src/middleware/upload.js`)
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userUploadDir = path.join(__dirname, '../../uploads', `user_${req.user.id}`);
    // Auto-creates directory
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    // Unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});
```

### Customization Options

**Change File Size Limit:**
```javascript
limits: {
  fileSize: 50 * 1024 * 1024 // 50MB
}
```

**Add File Type Restrictions:**
```javascript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};
```

**Change Storage Location:**
```javascript
destination: (req, file, cb) => {
  const customDir = path.join(__dirname, '../../my-uploads');
  cb(null, customDir);
}
```

---

## 🐛 Troubleshooting

### Issue: "No file uploaded" error
**Cause**: FormData not properly created or field name mismatch

**Solution**:
- Verify field name is 'file' in FormData
- Check if file input has a selected file
- Verify Content-Type is 'multipart/form-data'

---

### Issue: "Permission denied" on upload
**Cause**: Server doesn't have write permissions

**Solution**:
```powershell
# Windows - Grant write permissions to uploads directory
icacls "server/uploads" /grant Users:F
```

---

### Issue: File uploads but doesn't appear
**Cause**: fetchFiles() not called after upload

**Solution**: Already implemented in store - automatically refreshes after upload

---

### Issue: "Failed to upload file" error
**Cause**: Backend not running or wrong URL

**Solution**:
1. Check server is running: `http://localhost:4000`
2. Verify Vite proxy configuration
3. Check browser Network tab for actual error

---

### Issue: Upload works but can't find file on disk
**Cause**: Looking in wrong directory

**Solution**:
Files are saved in: `server/uploads/user_<userId>/`
Check the database `files` table for exact path.

---

## 📊 API Documentation

### Upload Endpoint

**POST** `/api/files/upload`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required): File to upload
- `parentId` (optional): Parent folder ID

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "document.pdf",
    "type": "file",
    "path": "uploads/user_abc123/document-1234567890.pdf",
    "size": 2048576,
    "mimeType": "application/pdf",
    "userId": "abc123",
    "parentId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "File uploaded successfully"
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "error": "A file with this name already exists in this location"
}
```

---

## 🎯 Testing with Postman

### 1. Login First
```
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "password123"
}
```

Save the token from response.

### 2. Upload File
```
POST http://localhost:4000/api/files/upload
Authorization: Bearer <your-token>
Content-Type: multipart/form-data

Form Data:
- file: [Select file from computer]
- parentId: null (or folder ID)
```

---

## 📈 Future Enhancements

### Possible Improvements
- [ ] Multiple file uploads
- [ ] Drag & drop upload
- [ ] Upload progress bar
- [ ] File preview before upload
- [ ] Resume interrupted uploads
- [ ] File compression
- [ ] Virus scanning
- [ ] Cloud storage integration (S3, Azure Blob)

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] Multer installed in server: `npm list multer`
- [ ] `uploads/` directory exists (auto-created on first upload)
- [ ] Upload button visible in FileBrowser
- [ ] File input hidden but functional
- [ ] Upload button disabled during upload
- [ ] Success toast after upload
- [ ] File appears in list immediately
- [ ] File saved to disk at correct path
- [ ] Database record created with metadata
- [ ] Duplicate filenames prevented
- [ ] User-specific directories working

---

## 🎉 Success!

File upload is fully functional! Users can now:
✅ Upload files to any folder  
✅ See upload progress  
✅ View files immediately after upload  
✅ Files are securely stored per user  
✅ All metadata tracked in database  

**Start testing by uploading your first file!** 🚀
