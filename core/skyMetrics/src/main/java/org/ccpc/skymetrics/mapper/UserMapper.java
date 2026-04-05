package org.ccpc.skymetrics.mapper;

import org.ccpc.skymetrics.dto.UserDtos.UserAdminSummaryResponse;
import org.ccpc.skymetrics.dto.UserDtos.UserProfileResponse;
import org.ccpc.skymetrics.entity.Role;
import org.ccpc.skymetrics.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "roles", expression = "java(mapRoles(user.getRoles()))")
    @Mapping(target = "totalFlights", source = "flightCount")
    UserAdminSummaryResponse toAdminSummaryResponse(User user, int flightCount);

    @Mapping(target = "roles", expression = "java(mapRoles(user.getRoles()))")
    UserProfileResponse toProfileResponse(User user);

    default Set<String> mapRoles(Set<Role> roles) {
        if (roles == null) return null;
        return roles.stream().map(r -> r.getName().name()).collect(Collectors.toSet());
    }
}
