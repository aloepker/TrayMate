<h1 align="center">TrayMate</h1>

---

# Prepared By

* Adam Loepker
* Anthony Mao
* Gerry Summers
* Manxi Muhirwa
* Sabina Salimova
* Wendy Arenas Rosas

---

# Product Overview

TrayMate is a mobile meal ordering and management application designed for assisted living facilities and care environments. The platform helps residents independently order meals while ensuring dietary restrictions, allergies, and medical requirements are safely enforced.

Many care facilities still rely on manual workflows, which can result in communication issues, incorrect meal deliveries, and difficulty managing dietary restrictions. TrayMate addresses these challenges by providing a centralized digital platform where residents, caregivers, kitchen staff, and administrators can efficiently coordinate meal-related workflows.

The system improves resident independence through a clean and senior-friendly interface while reducing human error through automatic dietary validation and restriction tracking. It also integrates AI-powered meal recommendations to assist residents in selecting appropriate meals based on their preferences and dietary needs.

The platform includes:

* Resident meal ordering
* Dietary restriction and allergy tracking
* AI-powered meal recommendations
* Messaging system between stakeholders
* Meal delivery status tracking
* Caregiver dashboard
* Kitchen staff workflow interface
* Administrative controls

---

# MVP Features

## Core Features

* Resident meal browsing and ordering
* Dietary restriction and allergy tracking
* AI-powered meal recommendations
* Messaging system
* Meal delivery tracking
* Caregiver dashboard
* Kitchen staff workflow interface
* Administrative controls
* Authentication and role-based access control

## Dietary Safety Features

* Automatic meal validation against restrictions and allergies
* Unsafe meal prevention
* Alternative meal suggestions
* Restriction severity tracking
* Staff override approval workflows
* Default compliant meal selection
* Alert system when no compliant meal exists

---

# Product Demo Video

Watch the demo here: [TrayMate Demo Video](https://www.youtube.com/watch?v=Wil1UaUq-1o) 

---

# Technology Stack

## Frontend

* **React Native** — Used to build the cross-platform mobile application for Android devices while maintaining a responsive and accessible user interface.

* **TypeScript** — Provides type safety, maintainability, and scalability for frontend development.

## Backend

- **Spring Boot** — Used to develop REST APIs and backend business logic for authentication, meal management, messaging, and workflow coordination.

- **Spring Security** — Provides authentication and authorization functionality.

- **Hibernate / Spring Data JPA** — Handles object-relational mapping and database interaction.

## Database

- **AWS MySQL RDS** — Cloud-hosted relational database used to store users, meals, dietary restrictions, orders, and messaging data.

## AI Integration

- **Gemini API** — Used to generate personalized AI-powered meal recommendations based on resident preferences and dietary restrictions.

## Hosting & Deployment

- **Render** — Used for backend hosting and deployment.

- **Docker** — Used to containerize backend services for deployment consistency.

## CI/CD

- **GitHub Actions** — Used to automate workflows, testing, and deployment pipelines.

- **Render Deployment Pipelines** — Used for automated backend deployment and continuous delivery.

---

# Development & Collaboration Tools

* GitHub
* Jira
* VS Code
* Android Studio
* Postman
* Cypress
* Figma
* Microsoft Teams

---

# Build & Run Instructions

## Prerequisites

Install the following software before running the application:

* Node.js (LTS Version Recommended)  https://nodejs.org/

* npm  (Automatically included with Node.js installation)

* Java Development Kit (JDK 17 Recommended) https://www.oracle.com/java/technologies/downloads/

* Android Studio  https://developer.android.com/studio

* Android SDK  (Installed through Android Studio)

* Git  https://git-scm.com/downloads

**Note:** The Spring Boot backend is already deployed on Render and does not need to be run locally for standard application testing. However, Android builds require Java because Gradle and the Android build toolchain run on the Java Virtual Machine (JVM).

**Architecture Note:** The mobile application communicates directly with the deployed backend APIs, allowing the app to be tested without running backend services locally.

## Clone the Repository

```bash
git clone https://github.com/aloepker/TrayMate.git
cd TrayMate
```

## Install Dependencies

Install all required frontend dependencies:

```bash
npm install
```

## Open Android Studio

1. Open Android Studio
2. Install the Android SDK if prompted
3. Open the Android Virtual Device (AVD) Manager
4. Create or launch an Android emulator/tablet device

## Start the React Native Development Server

Run the Metro bundler:

```bash
npx react-native start
```

## Run the Application on Android

Open a second terminal window and run:

```bash
npx react-native run-android
```

The application should automatically install and launch on the Android emulator.

---

# Build Release APK

Navigate to the Android directory:

```bash
cd android
```

Build the release APK:

```bash
./gradlew assembleRelease
```

The APK file will be generated at:

```bash
android/app/build/outputs/apk/release/
```

The generated APK will be named:

```text
app-release.apk
```

---

# Login Credentials

Use the following administrator account to access the application:

```text
Email: admin@traymate.com
Password: admin123
```

The administrator account can create and manage:

* Caregiver accounts
* Kitchen staff accounts
* Residents

A preconfigured administrator account is included for demonstration and testing purposes.

---

# Product Overview Poster

![TrayMate Poster](https://i.postimg.cc/D05Ysz5x/Your-paragraph-text-(5).png)

---

# Future Improvements

* Voice assistant integration
* Nutritional analysis scanner
* Expanded accessibility support
* Enhanced analytics dashboard
* Improved AI recommendation system

---

# Acknowledgements

Special thanks to:

* Professor Andy Cameron
* Seattle Pacific University Board of Advisors
* Traymate development team
