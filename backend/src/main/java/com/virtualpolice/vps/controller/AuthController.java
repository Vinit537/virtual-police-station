package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.service.AuthService;
import com.virtualpolice.vps.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final OtpService otpService;

    public AuthController(AuthService authService, OtpService otpService) {
        this.authService = authService;
        this.otpService = otpService;
    }

    @PostMapping("/register")
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public AuthDtos.ProfileResponse profile(Authentication auth) {
        return authService.profile(auth.getName());
    }

    @PostMapping("/otp/generate")
    public AuthDtos.OtpGenerateResponse generateOtp(@Valid @RequestBody AuthDtos.OtpGenerateRequest request) {
        String otp = otpService.generateOtp(request.aadhaarNumber());
        return new AuthDtos.OtpGenerateResponse("OTP generated", otp);
    }

    @PostMapping("/otp/verify")
    public AuthDtos.OtpVerifyResponse verifyOtp(@Valid @RequestBody AuthDtos.OtpVerifyRequest request) {
        boolean ok = otpService.verifyOtp(request.aadhaarNumber(), request.otp());
        return new AuthDtos.OtpVerifyResponse(ok, ok ? "OTP verified" : "Invalid OTP");
    }
}
