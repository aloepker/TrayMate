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

---

# Configure the AI API before building

For the AI to work correctly, 
you must configure the AI API with your personal API key before building the project using the following steps:

1. Copy the template:  
```bash
cp .env.example .env
```
2. Get a key from https://aistudio.google.com/apikey 
3. Add it to  the newly created .env: GEMINI_API_KEY=your_key_here 
4. Save the .env file

---

# Running the Backend Locally (Optional)

The backend API is already deployed on Render and does not need to be run locally for normal application testing.

Developers who wish to run the backend locally can do so using the following steps.

## Configure Database Credentials

Before starting the backend, provide values for the following environment variables:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
```

These variables are used by Spring Boot to connect to your database.

## Start the Backend

Navigate to the backend directory:

```bash
cd backend
```

Run the Spring Boot application:

```bash
./mvnw spring-boot:run
```

The backend will start on:

```text
http://localhost:8080
```

unless a different port is specified.

---

## Connect the Mobile App to the Local Backend

By default, the mobile application points to the deployed backend.

To use a locally running backend, open:

```text
src/services/api.tsx
```

and update the `BASE_URL` value to your local backend address.

Example:

```typescript
const BASE_URL = "http://localhost:8080";
```

> Note: If using an Android emulator, you may need to use `http://10.0.2.2:8080` instead of `localhost`.

---

## Running with Docker (Optional)

The backend is containerized and can also be run using Docker.

Build the image:

```bash
docker build -t traymate-backend .
```

Run the container:

```bash
docker run -p 8080:8080 \
  -e DB_URL=<your-db-url> \
  -e DB_USERNAME=<your-db-username> \
  -e DB_PASSWORD=<your-db-password> \
  traymate-backend
```

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

The generated APK can be moved to the android studio environment or any android device for testing.

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
