# Virtual Police Station - Digital FIR Registration System

Production-style academic full-stack implementation using React + Vite, Spring Boot, JWT Security, OCR integration, and MySQL.

## Architecture
- Presentation Layer: React frontend with role-based dashboards and form validation.
- Application Layer: Spring Boot REST API with JWT, OTP simulation, OCR extraction, categorization, and business services.
- Data Layer: MySQL schema for users, FIR, evidence, police officers, status logs, and OTP sessions.

Data flow:
`UI -> API -> Service -> Database`

## Tech Stack
- Frontend: React, Vite, React Router, Axios, TailwindCSS, React Hook Form + Zod, Vitest, React Testing Library
- Backend: Spring Boot 3, Spring Security, JWT, Spring Data JPA, Hibernate, Maven, JUnit
- Database: MySQL
- OCR: Multipart file upload OCR (image/PDF/TXT), Tesseract + PDF text extraction, structured parsing

## Folder Structure
- `frontend/` React application
- `backend/` Spring Boot application
- `database/` schema and seed SQL
- `docs/` architecture and UML/DFD diagrams

## Key Features Implemented
- User registration/login with JWT and role-based access (`CITIZEN`, `POLICE`, `ADMIN`)
- Aadhaar OTP simulation and verification
- Digital signature hash generation (`SHA-256(aadhaar + fir_id + timestamp)`)
- FIR submission and tracking timeline
- Evidence upload metadata capture
- OCR extraction service from uploaded complaint file (multipart)
- OCR-assisted FIR auto-fill with editable suggestions before submission
- Automated complaint categorization (theft, cybercrime, assault, fraud)
- Police dashboard for status updates
- Admin dashboard for user/officer/activity overview

## Frontend Setup
1. Open terminal in `frontend/`
2. Install dependencies:
   - `npm install`
3. Run development server:
   - `npm run dev`
4. Run tests:
   - `npm test`
5. Build production bundle:
   - `npm run build`

## Backend Setup
1. Install Maven 3.9+ if not present.
2. Create MySQL DB (or run `database/schema.sql`).
3. Configure credentials in `backend/src/main/resources/application.yml`.
4. Run backend:
   - `mvn spring-boot:run`
5. Run backend tests:
   - `mvn test`

### No Maven Installed (Auto Bootstrap)
From workspace root:
- `powershell -ExecutionPolicy Bypass -Command "New-Item -ItemType Directory -Force -Path .tools | Out-Null; Invoke-WebRequest -Uri https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip -OutFile .tools/apache-maven-3.9.9-bin.zip; Expand-Archive -Path .tools/apache-maven-3.9.9-bin.zip -DestinationPath .tools -Force"`

Then run:
- `./.tools/apache-maven-3.9.9/bin/mvn.cmd -f backend/pom.xml test -Dspring.profiles.active=test`
- `./.tools/apache-maven-3.9.9/bin/mvn.cmd -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=test`

## Quick Start For Shared Copy
If you are opening the packaged project on another machine:

1. Install Java 21+ and Node.js 20+.
2. Open the project root.
3. Run `powershell -ExecutionPolicy Bypass -File .\start-project.ps1`
4. Open `http://localhost:5173`

You can also start the services separately:
- Backend: `powershell -ExecutionPolicy Bypass -File .\start-backend.ps1`
- Frontend: `powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1`

## Database Setup
1. Run:
   - `database/schema.sql`
2. Optional seed:
   - `database/seed.sql`

## API Modules
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/otp/generate`
  - `POST /api/auth/otp/verify`
- Citizen:
   - `POST /api/citizen/ocr/extract` (multipart file upload)
  - `POST /api/citizen/fir`
  - `GET /api/citizen/fir`
  - `POST /api/citizen/fir/{id}/evidence`
  - `GET /api/citizen/fir/{id}/timeline`
- Police:
  - `GET /api/police/fir`
  - `PATCH /api/police/fir/{id}`
- Admin:
  - `GET /api/admin/stats`
  - `GET /api/admin/users`
  - `GET /api/admin/officers`
  - `GET /api/admin/activity`

## OCR Integration Notes
- OCR now uses real upload flow: frontend sends multipart file to `/api/citizen/ocr/extract`.
- Allowed types: `image/jpeg`, `image/png`, `application/pdf`, `text/plain`.
- Default file size limit: `5 MB` (configurable via `app.ocr.max-file-size-kb` and Spring multipart settings).
- Image OCR uses `tesseract <temp-file> stdout`.
- PDF OCR extracts text through PDF parsing.
- API returns structured data: extracted text, detected location/keywords, and suggested title/description/category/priority.

## Testing Coverage
Backend tests include:
- OTP generation/verification unit test
- OCR extraction unit test
- End-to-end auth + FIR integration flow (MockMvc)
- Security access checks
- Performance simulation for multiple FIR submissions

Frontend tests include:
- Login page rendering and form visibility
- Citizen OCR upload and FIR auto-fill behavior

## Diagrams
All required diagrams are provided in:
- `docs/diagrams.md`

## Verification Status in This Environment
- Frontend tests: Passed
- Frontend production build: Passed
- Backend source diagnostics: Passed
- Backend test suite (JUnit + integration + security + performance): Passed
- Backend live API smoke flow (auth, OTP, FIR, evidence, police updates, admin stats): Passed
