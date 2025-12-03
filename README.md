# TimeDesk - Modern Attendance Management System

TimeDesk is a comprehensive, role-based attendance and leave management system designed for modern organizations. Built with **Next.js 16**, **Supabase**, and **Tailwind CSS**, it offers a seamless experience for Employees, Managers, HR, and Admins.

![TimeDesk Banner](public/timedesk-logo.png)
*(Note: Replace with a dashboard screenshot)*

## 🚀 Key Features

### 👥 Role-Based Access Control (RBAC)
- **Admin**: Full system control, user management, department configuration, and global settings.
- **HR**: Attendance monitoring, leave approvals, and organizational reports.
- **Manager**: Team attendance tracking and leave approvals.
- **Employee**: Easy check-in/out, leave applications, and personal attendance history.

### 📅 Master Attendance Dashboard
- **Daily Snapshot**: View real-time status of all employees for the current day.
- **Calendar View**: Visual monthly overview with "Absent" tracking for missing records.
- **Smart Sorting**: Employees sorted by "Latest Activity" to highlight active users.
- **Advanced Filters**: Filter by Department, Role, or Search by Name.

### 📝 Leave Management
- **Flexible Leave Types**: Configurable leave types (Sick, Casual, Privilege, etc.).
- **Dynamic Status**: Handles Half-Day leaves and specific time availability.
- **Approval Workflow**: Streamlined process for requesting and approving leaves.
- **Balance Tracking**: Real-time view of remaining leave quotas.

### 📱 Mobile-First & PWA
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop.
- **Progressive Web App (PWA)**: Installable on mobile devices ("Add to Home Screen") for a native app-like experience.
- **Touch-Friendly**: Optimized UI elements for touch interactions.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime)
- **State Management**: React Hooks & Context
- **Icons**: [Lucide React](https://lucide.dev/)

## 📸 Screenshots

| Dashboard (Desktop) | Mobile View |
|:---:|:---:|
| ![Dashboard](path/to/dashboard-desktop.png) | ![Mobile](path/to/mobile-view.png) |
| *Comprehensive overview* | *Optimized for small screens* |

| Master Attendance | Calendar View |
|:---:|:---:|
| ![List View](path/to/list-view.png) | ![Calendar View](path/to/calendar-view.png) |
| *Daily snapshot of employee status* | *Monthly attendance tracking* |

*(Please add screenshots to the `public/screenshots` folder and update the paths)*

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase Account

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/timedesk.git
    cd timedesk/client
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory and add your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```
client/
├── public/             # Static assets (images, manifest.json)
├── src/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # Reusable UI components
│   ├── lib/            # Utility functions
│   ├── utils/          # Supabase client & helpers
│   └── ...
├── next.config.ts      # Next.js configuration
└── tailwind.config.ts  # Tailwind configuration
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---
Developed by **Rahul Tripathi**
