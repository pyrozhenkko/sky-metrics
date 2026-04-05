package org.ccpc.skymetrics.repository;

import org.ccpc.skymetrics.entity.ERole;
import org.ccpc.skymetrics.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByName(ERole name);
}