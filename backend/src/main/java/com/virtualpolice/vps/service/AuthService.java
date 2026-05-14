package com.virtualpolice.vps.service;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.PoliceOfficer;
import com.virtualpolice.vps.model.Role;
import com.virtualpolice.vps.model.UserAccount;
import com.virtualpolice.vps.repository.PoliceOfficerRepository;
import com.virtualpolice.vps.repository.UserRepository;
import com.virtualpolice.vps.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PoliceOfficerRepository policeOfficerRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PoliceOfficerRepository policeOfficerRepository,
                       OtpService otpService,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.policeOfficerRepository = policeOfficerRepository;
        this.otpService = otpService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }
        if (!otpService.isVerified(request.aadhaarNumber())) {
            throw new IllegalStateException("Please verify Aadhaar OTP before registration");
        }

        UserAccount user = new UserAccount();
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAadhaarNumber(request.aadhaarNumber());
        user.setRole(request.role() == null ? Role.CITIZEN : request.role());
        UserAccount saved = userRepository.save(user);

        if (saved.getRole() == Role.POLICE) {
            PoliceOfficer officer = new PoliceOfficer();
            officer.setUser(saved);
            officer.setBadgeNumber("BG" + saved.getId());
            officer.setStationName("Central Station");
            policeOfficerRepository.save(officer);
        }

        String token = jwtService.generateToken(saved.getId(), saved.getEmail(), saved.getRole());
        return new AuthDtos.AuthResponse(token, saved.getRole(), saved.getFullName());
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        UserAccount user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthDtos.AuthResponse(token, user.getRole(), user.getFullName());
    }
}
