package org.ccpc.skymetrics.service;

import org.ccpc.skymetrics.dto.UserDtos.UserAdminSummaryResponse;
import org.ccpc.skymetrics.dto.UserDtos.SystemStatsResponse;
import org.ccpc.skymetrics.dto.UserDtos.UpdateProfileRequest;
import org.ccpc.skymetrics.entity.ERole;
import org.ccpc.skymetrics.entity.Role;
import org.ccpc.skymetrics.entity.User;
import org.ccpc.skymetrics.entity.FlightSession;
import org.ccpc.skymetrics.repository.RoleRepository;
import org.ccpc.skymetrics.repository.UserRepository;
import org.ccpc.skymetrics.repository.FlightSessionRepository;
import org.ccpc.skymetrics.dto.AuthDtos.SignupRequest;
import org.ccpc.skymetrics.mapper.UserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FlightSessionRepository flightSessionRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder encoder;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public List<UserAdminSummaryResponse> getAllUsersForAdmin() {
        return userRepository.findAll().stream()
                .map(user -> userMapper.toAdminSummaryResponse(user, (int) flightSessionRepository.countByUserId(user.getId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateUserRoles(Long targetUserId, Set<String> strRoles) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Set<Role> newRoles = new HashSet<>();

        if (strRoles != null) {
            strRoles.forEach(roleStr -> {
                if (roleStr.equalsIgnoreCase("admin") || roleStr.equalsIgnoreCase("ROLE_ADMIN")) {
                    Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                            .orElseThrow(() -> new RuntimeException("Role not found"));
                    newRoles.add(adminRole);
                } else {
                    Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                            .orElseThrow(() -> new RuntimeException("Role not found"));
                    newRoles.add(userRole);
                }
            });
        }

        if (newRoles.isEmpty()) {
            newRoles.add(roleRepository.findByName(ERole.ROLE_USER)
                    .orElseThrow(() -> new RuntimeException("Role not found")));
        }

        user.setRoles(newRoles);
        userRepository.save(user);
    }

    @Transactional
    public void updateUser(Long targetUserId, UpdateProfileRequest request) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.username() != null && !request.username().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.username())) {
                throw new RuntimeException("Error: Username is already taken!");
            }
            user.setUsername(request.username());
        }

        if (request.email() != null && !request.email().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.email())) {
                throw new RuntimeException("Error: Email is already in use!");
            }
            user.setEmail(request.email());
        }

        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<FlightSession> sessions = flightSessionRepository.findAllByUserIdOrderByUploadedAtDesc(targetUserId);
        for (FlightSession session : sessions) {
            try {
                fileStorageService.delete(session.getId(), session.getOriginalFilename());
            } catch (Exception e) {}
            flightSessionRepository.delete(session);
        }

        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public SystemStatsResponse getSystemStats() {
        long totalUsers = userRepository.count();
        long totalFlights = flightSessionRepository.count();
        Double totalHours = flightSessionRepository.sumAllFlightDurations();
        if (totalHours == null) {
            totalHours = 0.0;
        } else {
            totalHours = totalHours / 3600.0;
        }
        return new SystemStatsResponse(totalUsers, totalFlights, totalHours);
    }

    @Transactional
    public void createUser(SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.username())) {
            throw new RuntimeException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.email())) {
            throw new RuntimeException("Error: Email is already in use!");
        }

        User user = User.builder()
                .username(signUpRequest.username())
                .email(signUpRequest.email())
                .password(encoder.encode(signUpRequest.password()))
                .build();

        Set<String> strRoles = signUpRequest.roles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null || strRoles.isEmpty()) {
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                if (role.equalsIgnoreCase("admin") || role.equalsIgnoreCase("ROLE_ADMIN")) {
                    Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(adminRole);
                } else {
                    Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(userRole);
                }
            });
        }

        user.setRoles(roles);
        userRepository.save(user);
    }
}