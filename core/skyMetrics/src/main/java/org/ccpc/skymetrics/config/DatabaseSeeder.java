package org.ccpc.skymetrics.config;

import lombok.RequiredArgsConstructor;
import org.ccpc.skymetrics.entity.ERole;
import org.ccpc.skymetrics.entity.Role;
import org.ccpc.skymetrics.entity.User;
import org.ccpc.skymetrics.repository.RoleRepository;
import org.ccpc.skymetrics.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                .orElseGet(() -> roleRepository.save(new Role(null, ERole.ROLE_USER)));
        
        Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(null, ERole.ROLE_ADMIN)));

        String commonPassword = passwordEncoder.encode("admin123");

        if (!userRepository.existsByEmail("admin@skymetrics.com")) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@skymetrics.com")
                    .password(commonPassword)
                    .roles(Set.of(adminRole, userRole))
                    .build();
            userRepository.save(admin);
        }

        for (int i = 1; i <= 5; i++) {
            String email = "user" + i + "@gmail.com";
            if (!userRepository.existsByEmail(email)) {
                User user = User.builder()
                        .username("user" + i)
                        .email(email)
                        .password(commonPassword)
                        .roles(Set.of(userRole))
                        .build();
                userRepository.save(user);
            }
        }
    }
}
