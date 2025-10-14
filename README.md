# SyncDrive - Multi-User File Management System with OS Simulation

A comprehensive web-based file management system that integrates operating system concepts for enhanced collaboration and educational purposes. Built with React, Bootstrap, and Framer Motion.

## 🚀 Features

### Core File Management
- **File & Directory Operations**: Create, read, update, delete files and folders
- **Drag & Drop Support**: Intuitive file upload and organization
- **Search & Filter**: Advanced search with multiple sorting options
- **Grid & List Views**: Flexible viewing modes for different preferences
- **Breadcrumb Navigation**: Easy navigation through directory structure

### Authentication & Security
- **Role-Based Access Control (RBAC)**: Secure permission-based file sharing
- **User Management**: Multi-user support with different access levels
- **Audit Logging**: Complete activity tracking for transparency
- **Session Management**: Secure authentication with context-based state

### OS Simulation Modules
- **Memory Management**: Visual simulation of memory allocation strategies
  - First Fit, Best Fit, Worst Fit algorithms
  - Real-time memory fragmentation visualization
  - Process allocation and deallocation
- **Process Scheduling**: Interactive process scheduling algorithms
  - FCFS, SJF, Priority, Round Robin scheduling
  - Gantt chart visualization
  - Performance metrics and comparison
- **Deadlock Detection**: Banker's algorithm implementation
  - Resource allocation graph visualization
  - Cycle detection and prevention
  - System safety analysis

### Real-Time Features
- **Live Dashboard**: Real-time system monitoring and statistics
- **Activity Feed**: Live updates of user actions and system events
- **Performance Charts**: Dynamic charts showing system performance
- **Notifications**: Toast notifications for important events

### User Interface
- **Responsive Design**: Mobile-first approach with Bootstrap
- **Smooth Animations**: Framer Motion for delightful interactions
- **Modern UI**: Clean, professional interface with intuitive navigation
- **Accessibility**: WCAG compliant design patterns

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite
- **Styling**: Bootstrap 5, Custom CSS
- **Animations**: Framer Motion
- **Charts**: Chart.js with React-ChartJS-2
- **State Management**: Zustand
- **Icons**: React Icons
- **Notifications**: React Hot Toast
- **File Handling**: React Dropzone
- **Real-time**: Socket.io Client (simulated)

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.jsx          # Top navigation bar
│   │   └── Sidebar.jsx         # Side navigation menu
│   ├── files/
│   │   └── FileBrowser.jsx     # Main file management interface
│   ├── dashboard/
│   │   └── Dashboard.jsx       # System overview and analytics
│   └── os/
│       ├── MemoryManagement.jsx    # Memory allocation simulation
│       ├── ProcessScheduling.jsx   # Process scheduling simulation
│       └── DeadlockDetection.jsx   # Deadlock detection simulation
├── contexts/
│   └── AuthContext.jsx         # Authentication context provider
├── store/
│   └── fileStore.js           # File management state store
├── App.jsx                    # Main application component
├── App.css                    # Global styles
└── main.jsx                   # Application entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SyncDrive
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📊 OS Simulation Features

### Memory Management
- **Visual Memory Layout**: Real-time visualization of memory blocks
- **Allocation Strategies**: Interactive demonstration of different algorithms
- **Fragmentation Analysis**: Live fragmentation monitoring
- **Process Lifecycle**: Add/remove processes with configurable parameters

### Process Scheduling
- **Multiple Algorithms**: FCFS, SJF, Priority, Round Robin
- **Gantt Chart**: Visual representation of process execution
- **Performance Metrics**: Waiting time, turnaround time, response time
- **Interactive Controls**: Add processes, configure time quantum

### Deadlock Detection
- **Resource Allocation Graph**: Visual representation of system state
- **Banker's Algorithm**: Safety algorithm implementation
- **Cycle Detection**: Automatic deadlock identification
- **System Recovery**: Suggested recovery strategies

## 🎯 Educational Value

This project serves as both a practical file management tool and an educational platform for:

- **Operating System Concepts**: Hands-on experience with core OS algorithms
- **System Design**: Understanding of resource management and scheduling
- **Real-time Systems**: Experience with concurrent processing and synchronization
- **Web Development**: Modern React patterns and state management

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3001
VITE_APP_NAME=SyncDrive
```

### Customization
- **Themes**: Modify `src/App.css` for custom styling
- **Simulation Parameters**: Adjust default values in OS simulation components
- **User Roles**: Configure permissions in `src/contexts/AuthContext.jsx`

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured experience with sidebar navigation
- **Tablet**: Adaptive layout with collapsible sidebar
- **Mobile**: Touch-optimized interface with bottom navigation

## 🔒 Security Features

- **Input Validation**: Client-side validation for all user inputs
- **XSS Protection**: Sanitized content rendering
- **CSRF Protection**: Token-based request validation
- **Secure Headers**: Content Security Policy implementation

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
docker build -t syncdrive .
docker run -p 3000:3000 syncdrive
```

### Cloud Deployment
- **Vercel**: Zero-config deployment with Vercel CLI
- **Netlify**: Drag-and-drop deployment
- **AWS S3**: Static website hosting with CloudFront

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Bootstrap for the responsive CSS framework
- Framer Motion for smooth animations
- Chart.js for beautiful data visualization
- All contributors and users of this project

## 📞 Support

For support, email support@syncdrive.com or create an issue in the repository.

---

**SyncDrive** - Where File Management Meets Operating System Education