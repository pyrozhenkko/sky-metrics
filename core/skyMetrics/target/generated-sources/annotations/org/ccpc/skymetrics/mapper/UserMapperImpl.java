package org.ccpc.skymetrics.mapper;

import java.util.Set;
import javax.annotation.processing.Generated;
import org.ccpc.skymetrics.dto.UserDtos;
import org.ccpc.skymetrics.entity.User;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-05T21:02:45+0300",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserDtos.UserAdminSummaryResponse toAdminSummaryResponse(User user, int flightCount) {
        if ( user == null ) {
            return null;
        }

        Long id = null;
        String username = null;
        String email = null;
        if ( user != null ) {
            id = user.getId();
            username = user.getUsername();
            email = user.getEmail();
        }
        Integer totalFlights = null;
        totalFlights = flightCount;

        Set<String> roles = mapRoles(user.getRoles());

        UserDtos.UserAdminSummaryResponse userAdminSummaryResponse = new UserDtos.UserAdminSummaryResponse( id, username, email, roles, totalFlights );

        return userAdminSummaryResponse;
    }

    @Override
    public UserDtos.UserProfileResponse toProfileResponse(User user) {
        if ( user == null ) {
            return null;
        }

        Long id = null;
        String username = null;
        String email = null;

        id = user.getId();
        username = user.getUsername();
        email = user.getEmail();

        Set<String> roles = mapRoles(user.getRoles());

        UserDtos.UserProfileResponse userProfileResponse = new UserDtos.UserProfileResponse( id, username, email, roles );

        return userProfileResponse;
    }
}
