# Workera - Work Management Platform

A modern, collaborative work management platform inspired by Monday.com, built with React, TypeScript, and Supabase.

## 🌟 Features

### Core Functionality
- **📋 Board Management** - Create and manage multiple boards with customizable columns
- **✅ Task Management** - Create, assign, and track tasks with rich details
- **👥 User Management** - Comprehensive user administration with role-based access
- **💼 Workspace Organization** - Organize projects into workspaces
- **🔔 Real-time Notifications** - Stay updated with @mentions and activity
- **📊 Activity Logs** - Track all system activities and changes

### Admin Features
- **Super Admin Dashboard** - Complete system oversight
- **IT Admin Controls** - Workspace and user management
- **Role Management** - Flexible role assignment (Super Admin, IT Admin, User)
- **User Analytics** - Track active users and workspaces
- **Activity Monitoring** - View all system events in real-time

### User Experience
- **@Mentions** - Tag users in comments and tasks
- **Real-time Updates** - Instant synchronization across all users
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Intuitive UI** - Clean, modern interface inspired by industry leaders

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Styling:** Vanilla CSS with modern design patterns
- **Icons:** Lucide React
- **State Management:** React Hooks + Supabase Realtime

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Jirawat209/Workera.git
cd Workera
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

Run the SQL scripts in your Supabase SQL Editor. You have two options:

**Option 1: Quick Setup (Recommended)**
Run the complete setup script:
- `scripts/setup_complete.sql` - All-in-one setup script

**Option 2: Individual Scripts (Advanced)**
Run the following SQL scripts **in this order**:
1. `scripts/activity_logs_schema.sql` - Activity logging system
2. `scripts/delete_user_function.sql` - User deletion with logging
3. `scripts/trigger_user_signup_log.sql` - Auto-log user signups
4. `scripts/trigger_workspace_board_logs.sql` - Auto-log workspace/board creation
5. `db_schema.sql` - Notifications table and policies

**Note:** All SQL scripts are located in the `/scripts/` folder of this repository.

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🔐 User Roles

### Super Admin
- Full system access
- Manage all users and roles
- Delete users
- View all activity logs
- Access admin console

### IT Admin
- Manage workspaces
- View user list
- View activity logs
- Cannot modify Super Admins

### User
- Create and manage own workspaces
- Create boards and tasks
- Collaborate with team members
- Receive notifications

## 📊 Activity Logging

The system automatically logs:
- ✅ User signups
- ✅ Role changes
- ✅ User deletions
- ✅ Workspace creation
- ✅ Board creation

All logs are visible in the Admin Console with human-readable descriptions.

## 🎨 Key Features Detail

### Smart Action Buttons
- Hidden for own account
- Disabled (grayed) for higher-role users
- Enabled for lower-role users

### Popover Menus
- Smart positioning (opens upward near bottom of screen)
- Prevents viewport clipping
- Context-aware actions

### Real-time Collaboration
- @Mention notifications
- Live updates across all users
- Instant synchronization

## 📁 Project Structure

```
Workera/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin console components
│   │   ├── board/          # Board and task components
│   │   └── ...
│   ├── lib/
│   │   └── supabase.ts     # Supabase client
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── brain/                  # SQL scripts and documentation
├── public/                 # Static assets
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 👥 Team

Developed by Jirawat Kongka and team at Nara Hospitality.

## 📞 Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions including:
- Vercel deployment
- Netlify deployment
- GitHub Pages
- Team sharing options

## 🔄 Recent Updates

- ✅ Smart action button visibility logic
- ✅ Improved popover positioning
- ✅ Human-readable activity logs
- ✅ Complete activity logging system
- ✅ Role-based access control
- ✅ @Mention system with notifications

---

**Built with ❤️ using React, TypeScript, and Supabase**
