# Backend Setup Guide - File Management System

## ✅ What Was Created

### 1. **Database Schema**
- **New Table**: `files` table with complete schema for file/folder management
- **Columns**: id, name, type, path, size, mime_type, user_id, parent_id, created_at, updated_at
- **Foreign Keys**: Links to users table and self-referencing for folder hierarchy
- **Indexes**: Optimized for fast queries on user_id and parent_id

### 2. **Authentication Middleware**
- **File**: `server/src/middleware/auth.js`
- **Purpose**: JWT token verification for protected routes
- **Features**: Bearer token extraction, user identity attachment to request

### 3. **File Controller**
- **File**: `server/src/controllers/fileController.js`
- **Functions**:
  - `listFiles()` - List files/folders with optional parent filter
  - `createFolder()` - Create new folders with duplicate checking
  - `deleteFile()` - Delete files/folders with cascade
  - `renameFile()` - Rename with conflict detection

### 4. **Files Router**
- **File**: `server/src/routes/files.js`
- **Endpoints**:
  - `GET /api/files` - List files and folders
  - `POST /api/files/folder` - Create folder
  - `DELETE /api/files/:id` - Delete item
  - `PATCH /api/files/:id` - Rename item

### 5. **Updated Files**
- `server/src/db.js` - Added `ensureFilesTable()` function
- `server/src/index.js` - Integrated files router and table initialization

---

## 🚀 Quick Start

### Step 1: Configure Environment
```bash
cd server
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=syncdrive
JWT_SECRET=your-secret-key
PORT=4000
```

### Step 2: Install Dependencies (if not done)
```bash
npm install
```

### Step 3: Start MySQL
Ensure MySQL is running on your machine.

### Step 4: Start Server
```bash
npm run dev
```

You should see:
```
Server listening on http://localhost:4000
✓ Database initialized
✓ Users table ready
✓ Files table ready
```

---

## 🧪 Testing the API

### Using Postman or Thunder Client

#### 1. Create a User Account
**POST** `http://localhost:4000/api/auth/signup`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": { "id": "...", "name": "John Doe", ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**⚠️ Save the token!**

#### 2. Create Folders
**POST** `http://localhost:4000/api/files/folder`

**Headers:**
```
Authorization: Bearer <your-token-here>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Documents",
  "parentId": null
}
```

#### 3. List Files
**GET** `http://localhost:4000/api/files`

**Headers:**
```
Authorization: Bearer <your-token-here>
```

Expected empty array initially:
```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

After creating folders:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Documents",
      "type": "folder",
      "parentId": null,
      ...
    }
  ],
  "count": 1
}
```

#### 4. Create Subfolder
**POST** `http://localhost:4000/api/files/folder`

**Body:**
```json
{
  "name": "Work Projects",
  "parentId": 1
}
```

#### 5. List Folder Contents
**GET** `http://localhost:4000/api/files?parentId=1`

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name": "Work Projects",
      "type": "folder",
      "parentId": 1,
      ...
    }
  ],
  "count": 1
}
```

---

## 🔍 Verify Database

### Connect to MySQL
```bash
mysql -u root -p
```

### Check Tables
```sql
USE syncdrive;
SHOW TABLES;
-- Should show: files, users

DESCRIBE files;
```

### Query Files
```sql
SELECT * FROM files;
```

---

## 📁 File Structure Created

```
server/
├── src/
│   ├── controllers/
│   │   └── fileController.js      ✨ NEW
│   ├── middleware/
│   │   └── auth.js                ✨ NEW
│   ├── routes/
│   │   ├── auth.js
│   │   └── files.js               ✨ NEW
│   ├── db.js                      📝 UPDATED
│   └── index.js                   📝 UPDATED
├── .env.example                    ✨ NEW
├── API_DOCUMENTATION.md            ✨ NEW
├── SETUP_GUIDE.md                  ✨ NEW
└── package.json
```

---

## 🎯 Next Steps

### Implement in Frontend
Update your React app to:

1. **Store JWT token** after login/signup
2. **Add Authorization header** to all file API calls
3. **Replace Zustand mock data** with real API calls

Example fetch wrapper:
```javascript
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('auth_token');
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
};
```

### File Upload (Future Enhancement)
- Add `multer` for file uploads
- Create upload endpoint with file storage
- Update `path` field in database

---

## 🐛 Troubleshooting

### "Access token required" Error
- Ensure you're sending the token in Authorization header
- Format: `Bearer <token>` (note the space)

### "Invalid or expired token" Error
- Login again to get a fresh token
- Check JWT_SECRET matches between signup and login

### Database Connection Error
- Verify MySQL is running
- Check .env credentials
- Ensure database exists (auto-created on first run)

### CORS Errors
- Frontend should run on `http://localhost:5173`
- Backend CORS is configured for this origin

---

## 📝 API Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/files` | List files/folders | ✅ Yes |
| POST | `/api/files/folder` | Create folder | ✅ Yes |
| DELETE | `/api/files/:id` | Delete item | ✅ Yes |
| PATCH | `/api/files/:id` | Rename item | ✅ Yes |
| POST | `/api/auth/signup` | Register user | ❌ No |
| POST | `/api/auth/login` | Login user | ❌ No |

---

## ✨ Features Implemented

✅ User-specific file isolation (users only see their own files)  
✅ Folder hierarchy with parent-child relationships  
✅ Root directory support (parentId = null)  
✅ Duplicate name prevention in same location  
✅ Cascade delete for folders and contents  
✅ JWT authentication on all file operations  
✅ Proper error handling and validation  
✅ Optimized database queries with indexes  

---

**Ready to test!** Start the server and use Postman/Thunder Client to interact with the API. 🚀
