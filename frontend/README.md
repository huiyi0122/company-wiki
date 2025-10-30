# 💻 Company Internal Wiki Frontend

**Company Internal Wiki Frontend** is the React-based user interface for managing and browsing the company’s internal documentation system — including policies, SOPs, HR documents, technical documentation, project wikis, and onboarding guides.

---

## 1. 🌐 Project Overview

**Purpose:**

- Store and access company policies, SOPs, handbooks, and HR documents  
- Manage technical and project-related documentation  
- Provide a centralized wiki for internal teams  
- Offer onboarding materials for newcomers  

**Key Features:**

- User-friendly React interface  
- Markdown editing and preview support  
- Real-time notifications using React Toastify  
- Role-based routing with React Router DOM  
- Clean UI using vanilla CSS  
- Secure API communication with backend using JWT stored in Local Storage for authentication 

---

## 2. ⚒️ Tech Stack

- **React.js (Vite + TypeScript)** – Frontend framework  
- **React Router DOM** – Client-side routing  
- **React Toastify** – Toast notifications  
- **@uiw/react-md-editor** & **@uiw/react-markdown-preview** – Markdown editor and preview  
- **remark-gfm**, **remark-gemoji** – Markdown formatting and emoji support  
- **React Modal** – Modal dialogs  
- **Vanilla CSS** – Custom styling  

---

## 3. 📁 Project Structure

```

frontend/
├── src/
│   ├── assets/           # Images, icons, etc.
│   ├── components/       # Reusable UI components
│   ├── styles/           # CSS stylesheets
│   ├── utils/            # Helper utilities and functions
│   ├── App.tsx           # Main application file
│   └── main.tsx          # Entry point for rendering
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
└── README.md             # Project documentation

```

---

## 4. ⚡ Getting Started

### Prerequisites

Make sure you have the following installed before running the project:

- **Node.js** v18 or higher — required to run Vite and build the project  
- **npm** v8 or higher — package manager for installing dependencies  
  *(You can also use pnpm or yarn if preferred)*  
- **Modern browser** for development and testing (Chrome, Edge, Firefox, etc.)


### Install Dependencies

```bash
npm install
```

---

## 5. ⛳ Development

Start the frontend:

```bash
cd frontend
npm run dev
```

- Runs Vite dev server at  [http://localhost:5173](http://localhost:5173)

---


## 6. 📦 Build for Production

To build the frontend for production:

```bash
cd frontend
npm run build
```

---

## 7. 🛠️ Troubleshooting

This section lists frequent frontend issues, their causes, and solutions during development or build.

---

### ⚙️ Development Issues

| Issue | Possible Cause | Solution |
|-------|----------------|-----------|
| **Port 5173 already in use** | Port occupied by another process | Change `VITE_APP_PORT` in `.env` or stop conflicting process |
| **Cannot access via IP** | Missing `host` config | Set `server.host` to `'0.0.0.0'` |
| **Blank screen** | Routing or `base` misconfiguration | Verify `vite.config.ts` and `BrowserRouter` setup |
| **HMR not updating** | Cache or dependency conflict | Delete `.vite` and `node_modules`, reinstall |
| **Toast not showing** | Missing Toast container | Add `<ToastContainer />` in `App.tsx` |
| **Markdown editor error** | Dependency version mismatch | Lock compatible editor versions |

---

## 8. ✏️ Contributing

1. Fork this repository  
2. Create a new branch: `git checkout -b feature/your-feature`  
3. Commit your changes: `git commit -m "Add new feature"`  
4. Push the branch: `git push origin feature/your-feature`  
5. Submit a Pull Request 🚀
