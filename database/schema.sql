CREATE DATABASE IF NOT EXISTS virtual_police_station;
USE virtual_police_station;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  aadhaar_number VARCHAR(12) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS police_officers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  badge_number VARCHAR(100) NOT NULL UNIQUE,
  station_name VARCHAR(255) NOT NULL,
  CONSTRAINT fk_police_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fir_reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  citizen_id BIGINT NOT NULL,
  assigned_officer_id BIGINT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  location VARCHAR(200) NULL,
  assigned_station VARCHAR(255) NULL,
  extracted_name VARCHAR(255) NULL,
  extracted_location VARCHAR(255) NULL,
  extracted_crime_keywords VARCHAR(255) NULL,
  extracted_text TEXT NULL,
  digital_signature_hash VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fir_citizen FOREIGN KEY (citizen_id) REFERENCES users(id),
  CONSTRAINT fk_fir_officer FOREIGN KEY (assigned_officer_id) REFERENCES police_officers(id)
);

CREATE TABLE IF NOT EXISTS evidence_files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  fir_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evidence_fir FOREIGN KEY (fir_id) REFERENCES fir_reports(id)
);

CREATE TABLE IF NOT EXISTS status_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  fir_id BIGINT NOT NULL,
  status VARCHAR(30) NOT NULL,
  updated_by VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_status_fir FOREIGN KEY (fir_id) REFERENCES fir_reports(id)
);

CREATE TABLE IF NOT EXISTS otp_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  aadhaar_number VARCHAR(12) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS event_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
