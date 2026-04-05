package org.ccpc.skymetrics.dto;

import java.util.List;
import java.util.Set;


public class AuthDtos {

    public record LoginRequest(String username, String password) {}

    public record SignupRequest(String username, String email, String password, Set<String> roles) {}

    public record JwtResponse(String token, Long id, String username, String email, List<String> roles) {}

    public record MessageResponse(String message) {}
}