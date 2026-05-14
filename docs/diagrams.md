# Virtual Police Station Diagrams

## 1. Use Case Diagram
```mermaid
flowchart LR
  Citizen((Citizen))
  Police((Police Officer))
  Admin((Administrator))

  UC1([Register/Login])
  UC2([Verify Aadhaar OTP])
  UC3([Submit FIR])
  UC4([Upload Evidence])
  UC5([Track FIR Status])
  UC6([Review FIR])
  UC7([Categorize & Set Priority])
  UC8([Update Case Status])
  UC9([Manage Users/Officers])
  UC10([Monitor System Analytics])

  Citizen --> UC1
  Citizen --> UC2
  Citizen --> UC3
  Citizen --> UC4
  Citizen --> UC5

  Police --> UC1
  Police --> UC6
  Police --> UC7
  Police --> UC8

  Admin --> UC1
  Admin --> UC9
  Admin --> UC10
```

## 2. ER Diagram
```mermaid
erDiagram
  USERS ||--o{ FIR_REPORTS : files
  USERS ||--|| POLICE_OFFICERS : can_be
  POLICE_OFFICERS ||--o{ FIR_REPORTS : manages
  FIR_REPORTS ||--o{ EVIDENCE_FILES : has
  FIR_REPORTS ||--o{ STATUS_LOGS : tracks

  USERS {
    bigint id PK
    varchar full_name
    varchar email UK
    varchar password_hash
    varchar aadhaar_number UK
    varchar role
  }

  POLICE_OFFICERS {
    bigint id PK
    bigint user_id FK
    varchar badge_number UK
    varchar station_name
  }

  FIR_REPORTS {
    bigint id PK
    bigint citizen_id FK
    bigint assigned_officer_id FK
    varchar title
    text description
    varchar category
    varchar status
    varchar priority
    text extracted_text
    varchar digital_signature_hash
  }

  EVIDENCE_FILES {
    bigint id PK
    bigint fir_id FK
    varchar file_name
    varchar file_type
    varchar storage_path
  }

  STATUS_LOGS {
    bigint id PK
    bigint fir_id FK
    varchar status
    varchar updated_by
    datetime updated_at
  }
```

## 3. Class Diagram
```mermaid
classDiagram
  class UserAccount {
    +Long id
    +String fullName
    +String email
    +String passwordHash
    +String aadhaarNumber
    +Role role
  }

  class PoliceOfficer {
    +Long id
    +String badgeNumber
    +String stationName
  }

  class FirReport {
    +Long id
    +String title
    +String description
    +String category
    +FirStatus status
    +String priority
    +String extractedText
    +String digitalSignatureHash
  }

  class EvidenceFile {
    +Long id
    +String fileName
    +String fileType
    +String storagePath
  }

  class StatusLog {
    +Long id
    +FirStatus status
    +String updatedBy
    +LocalDateTime updatedAt
  }

  UserAccount "1" --> "many" FirReport : files
  UserAccount "1" --> "1" PoliceOfficer : maps
  PoliceOfficer "1" --> "many" FirReport : assigned
  FirReport "1" --> "many" EvidenceFile : contains
  FirReport "1" --> "many" StatusLog : timeline
```

## 4. Sequence Diagram
```mermaid
sequenceDiagram
  participant U as Citizen UI
  participant API as Spring API
  participant OTP as OTP Service
  participant OCR as OCR Service
  participant DB as MySQL
  participant P as Police UI

  U->>API: Register/Login
  API->>DB: Store/validate user
  U->>API: Generate OTP (Aadhaar)
  API->>OTP: create OTP
  OTP-->>U: OTP code
  U->>API: Verify OTP
  API->>OTP: validate code
  OTP-->>API: verified=true
  U->>API: Submit FIR + document path
  API->>OCR: extractText(document)
  OCR-->>API: extracted text
  API->>DB: Save FIR, evidence, status log
  P->>API: Review FIR
  API->>DB: Update status/category/priority
  API-->>U: Track updated FIR status
```

## 5. Activity Diagram
```mermaid
flowchart TD
  A([Start]) --> B[User registers/logs in]
  B --> C[Generate Aadhaar OTP]
  C --> D{OTP verified?}
  D -- No --> C
  D -- Yes --> E[Fill FIR form]
  E --> F[Upload evidence/document]
  F --> G[Run OCR on document]
  G --> H[Auto-categorize complaint]
  H --> I[Store FIR + digital signature]
  I --> J[Police reviews case]
  J --> K[Update status]
  K --> L[Citizen tracks progress]
  L --> M([End])
```

## 6. DFD Level 0
```mermaid
flowchart LR
  Citizen[Citizen]
  Police[Police Officer]
  Admin[Administrator]
  VPS[(Virtual Police Station System)]

  Citizen -->|Registration/FIR/Evidence| VPS
  VPS -->|Status updates| Citizen

  Police -->|Review and update case| VPS
  VPS -->|Assigned FIR data| Police

  Admin -->|Manage users and monitor| VPS
  VPS -->|Analytics and logs| Admin
```

## 7. DFD Level 1
```mermaid
flowchart TB
  Citizen[Citizen]
  Police[Police Officer]
  Admin[Admin]

  P1[1.0 Auth & OTP]
  P2[2.0 FIR Processing]
  P3[3.0 Evidence & OCR]
  P4[4.0 Case Management]
  P5[5.0 Admin Analytics]

  D1[(Users DB)]
  D2[(FIR DB)]
  D3[(Evidence DB)]
  D4[(Status Logs DB)]

  Citizen --> P1
  P1 --> D1

  Citizen --> P2
  P2 --> D2

  Citizen --> P3
  P3 --> D3
  P3 --> D2

  Police --> P4
  P4 --> D2
  P4 --> D4

  Admin --> P5
  P5 --> D1
  P5 --> D2
  P5 --> D4
```

## 8. System Flowchart
```mermaid
flowchart TD
  S([User Access Portal]) --> L{Login/Register}
  L -->|Register| R[Create account]
  L -->|Login| A[Authenticate with JWT]
  R --> A
  A --> Role{Role?}

  Role -->|Citizen| C1[Verify Aadhaar OTP]
  C1 --> C2[Submit FIR]
  C2 --> C3[Upload Evidence]
  C3 --> C4[OCR + Categorization]
  C4 --> C5[Store FIR and Signature Hash]
  C5 --> C6[View Tracking Timeline]

  Role -->|Police| P1[View FIR Queue]
  P1 --> P2[Assign Priority]
  P2 --> P3[Update Status]

  Role -->|Admin| AD1[Manage Users]
  AD1 --> AD2[Manage Officers]
  AD2 --> AD3[Review Analytics]

  P3 --> C6
```
