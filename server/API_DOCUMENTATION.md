# SyncDrive File Management API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication
All file management endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. List Files and Folders
**GET** `/api/files`

Fetches all files and folders for the authenticated user at a specific location.

**Query Parameters:**
- `parentId` (optional): ID of the parent folder. If not provided or set to `null`, fetches root directory items.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Documents",
      "type": "folder",
      "path": null,
      "size": null,
      "mimeType": null,
      "userId": "user-uuid",
      "parentId": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "report.pdf",
      "type": "file",
      "path": "/uploads/abc123.pdf",
      "size": 2048576,
      "mimeType": "application/pdf",
      "userId": "user-uuid",
      "parentId": 1,
      "createdAt": "2024-01-15T10:35:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "count": 2
}
```

**Example Usage:**
```bash
# Get root directory items
curl -X GET "http://localhost:4000/api/files" \
  -H "Authorization: Bearer <token>"

# Get items in folder with ID 5
curl -X GET "http://localhost:4000/api/files?parentId=5" \
  -H "Authorization: Bearer <token>"
```

---

### 2. Create Folder
**POST** `/api/files/folder`

Creates a new folder for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Folder",
  "parentId": 1  // Optional: null or omit for root directory
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "New Folder",
    "type": "folder",
    "path": null,
    "size": null,
    "mimeType": null,
    "userId": "user-uuid",
    "parentId": 1,
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "error": "A folder with this name already exists in this location"
}
```

**Example Usage:**
```bash
# Create folder in root directory
curl -X POST "http://localhost:4000/api/files/folder" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Projects", "parentId": null}'

# Create subfolder
curl -X POST "http://localhost:4000/api/files/folder" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Client Work", "parentId": 3}'
```

---

### 3. Delete File or Folder
**DELETE** `/api/files/:id`

Deletes a file or folder. If deleting a folder, all its contents are also deleted (cascade).

**Parameters:**
- `id` (required): The ID of the file or folder to delete

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "File or folder not found"
}
```

**Example Usage:**
```bash
# Delete file or folder with ID 7
curl -X DELETE "http://localhost:4000/api/files/7" \
  -H "Authorization: Bearer <token>"
```

---

### 4. Rename File or Folder
**PATCH** `/api/files/:id`

Renames a file or folder.

**Parameters:**
- `id` (required): The ID of the file or folder to rename

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Name"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Updated Name",
    "type": "folder",
    "path": null,
    "size": null,
    "mimeType": null,
    "userId": "user-uuid",
    "parentId": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "error": "A file or folder with this name already exists in this location"
}
```

**Example Usage:**
```bash
# Rename file or folder with ID 5
curl -X PATCH "http://localhost:4000/api/files/5" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Folder"}'
```

---

## Database Schema

### Files Table
```sql
CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('file', 'folder') NOT NULL,
  path VARCHAR(1024) NULL,              -- File path on server (for files only)
  size BIGINT NULL,                     -- File size in bytes (for files only)
  mime_type VARCHAR(255) NULL,          -- MIME type (for files only)
  user_id VARCHAR(36) NOT NULL,         -- References users(id)
  parent_id INT NULL,                   -- References files(id), NULL for root
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE
);
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Token expired |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate name in same location |
| 500 | Internal Server Error |

---

## Testing Workflow

### 1. Register a User
```bash
curl -X POST "http://localhost:4000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Save the token from the response!**

### 2. Create Some Folders
```bash
# Create Documents folder in root
curl -X POST "http://localhost:4000/api/files/folder" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Documents", "parentId": null}'

# Create Images folder in root
curl -X POST "http://localhost:4000/api/files/folder" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Images", "parentId": null}'
```

### 3. List Root Directory
```bash
curl -X GET "http://localhost:4000/api/files" \
  -H "Authorization: Bearer <your-token>"
```

### 4. Create Subfolder
```bash
# Assuming Documents folder has ID 1
curl -X POST "http://localhost:4000/api/files/folder" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Work", "parentId": 1}'
```

### 5. List Folder Contents
```bash
# List contents of Documents folder (ID 1)
curl -X GET "http://localhost:4000/api/files?parentId=1" \
  -H "Authorization: Bearer <your-token>"
```

---

## Notes

- **Authorization**: All file operations require a valid JWT token obtained from login/signup.
- **Cascade Delete**: Deleting a folder automatically deletes all its contents.
- **Name Uniqueness**: File/folder names must be unique within the same parent directory.
- **Parent ID**: Use `null` or omit `parentId` for root directory operations.
- **File Uploads**: File upload functionality will be implemented separately with multipart/form-data handling.
