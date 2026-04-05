package org.ccpc.skymetrics.controller;

import org.ccpc.skymetrics.dto.UserDtos.SystemStatsResponse;
import org.ccpc.skymetrics.dto.UserDtos.UpdateProfileRequest;
import org.ccpc.skymetrics.dto.AuthDtos.SignupRequest;
import org.ccpc.skymetrics.dto.UserDtos.ApiResponse;
import org.ccpc.skymetrics.dto.UserDtos.UpdateUserRolesRequest;
import org.ccpc.skymetrics.dto.UserDtos.UserAdminSummaryResponse;
import org.ccpc.skymetrics.dto.UserDtos.UserProfileResponse;
import org.ccpc.skymetrics.entity.User;
import org.ccpc.skymetrics.repository.UserRepository;
import org.ccpc.skymetrics.security.UserDetailsImpl;
import org.ccpc.skymetrics.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;


    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Set<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());

        return ResponseEntity.ok(new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roles
        ));
    }


    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserAdminSummaryResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsersForAdmin());
    }

    @PutMapping("/admin/{userId}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateUserRoles(
            @PathVariable Long userId,
            @RequestBody UpdateUserRolesRequest request) {

        try {
            userService.updateUserRoles(userId, request.roles());
            return ResponseEntity.ok(new ApiResponse<>(true, "User roles updated successfully", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @PutMapping("/admin/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest request) {
        try {
            userService.updateUser(userId, request);
            return ResponseEntity.ok(new ApiResponse<>(true, "User updated successfully", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @DeleteMapping("/admin/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long userId) {
        try {
            userService.deleteUser(userId);
            return ResponseEntity.ok(new ApiResponse<>(true, "User deleted successfully", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemStatsResponse> getSystemStats() {
        return ResponseEntity.ok(userService.getSystemStats());
    }

    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> createUser(@RequestBody SignupRequest request) {
        try {
            userService.createUser(request);
            return ResponseEntity.ok(new ApiResponse<>(true, "User created successfully", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }
}