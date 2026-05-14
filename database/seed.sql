USE virtual_police_station;

INSERT INTO users(full_name, email, password_hash, aadhaar_number, role)
VALUES
('Admin User', 'admin@vps.gov.in', '$2a$10$xVg9zVj6v3iFq8S6u4XvAep0I0T0q8e9rFwGQeEvf5P6p52J6fw6m', '111122223333', 'ADMIN'),
('Officer Kumar', 'officer@vps.gov.in', '$2a$10$xVg9zVj6v3iFq8S6u4XvAep0I0T0q8e9rFwGQeEvf5P6p52J6fw6m', '444455556666', 'POLICE'),
('Citizen Rao', 'citizen@vps.gov.in', '$2a$10$xVg9zVj6v3iFq8S6u4XvAep0I0T0q8e9rFwGQeEvf5P6p52J6fw6m', '777788889999', 'CITIZEN')
ON DUPLICATE KEY UPDATE email = VALUES(email);
