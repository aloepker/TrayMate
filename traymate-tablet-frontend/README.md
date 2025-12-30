# TrayMate — Tablet Frontend (Login)

This repository contains the **tablet-facing frontend** for the TrayMate application, built using **React Native** and **Expo**.  
It is designed for use in assisted living and healthcare settings.

---

## Tech Stack

- React Native
- Expo
- Expo Router (file-based routing)
- TypeScript

---

## Getting Started

### 1. Install dependencies
```bash
npm install

### 2. Start the development server
npx expo start

traymate-tablet-frontend/
├── app/                # Screens and navigation (Expo Router)
│   ├── _layout.tsx     # Root navigation layout
│   └── (tabs)/         # Tab-based screens (route group)
│
├── components/         # Reusable UI components
├── constants/          # Shared constants (colors, spacing, config)
├── hooks/              # Custom React hooks
├── assets/             # Images, icons, splash assets
│
├── package.json
├── tsconfig.json
├── eslint.config.js
└── README.md

### Navigation
This project uses Expo Router for file-based navigation.

The app/ directory defines all screens and routes.

_layout.tsx controls the root navigation.

Route groups (e.g., (tabs)) are used for organization and do not appear in the URL.

### Assets
The assets/ folder contains app icons, splash images, and UI assets.



In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

