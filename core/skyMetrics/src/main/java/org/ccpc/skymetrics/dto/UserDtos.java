package org.ccpc.skymetrics.dto;

import java.util.Set;

public class UserDtos {

    public record UserProfileResponse(
            Long id,
            String username,
            String email,
            Set<String> roles
    ) {}

    public record RoleDto(
            Integer id,
            String name
    ) {}

    public record ApiResponse<T>(
            boolean success,
            String message,
            T data
    ) {}

    public record UpdateProfileRequest(
            String username,
            String email
    ) {}

    public record ChangePasswordRequest(
            String currentPassword,
            String newPassword
    ) {}

    public record UserAdminSummaryResponse(
            Long id,
            String username,
            String email,
            Set<String> roles,
            Integer totalFlights
    ) {}

    public record UpdateUserRolesRequest(
            Set<String> roles
    ) {}

    public record SystemStatsResponse(
            long totalUsers,
            long totalFlights,
            Double totalFlightHours
    ) {}
}