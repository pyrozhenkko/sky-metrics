package org.ccpc.skymetrics.repository;

import org.ccpc.skymetrics.entity.FlightSession;
import org.ccpc.skymetrics.entity.FlightStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FlightSessionRepository extends JpaRepository<FlightSession, UUID> {
    @EntityGraph(attributePaths = {"user"})
    List<FlightSession> findAllByUserIdOrderByUploadedAtDesc(Long userId);

    long countByUserId(Long userId);

    @Query("SELECT SUM(f.metrics.flightDurationSec) FROM FlightSession f")
    Double sumAllFlightDurations();

    @EntityGraph(attributePaths = {"user"})
    List<FlightSession> findAllByStatusOrderByUploadedAtDesc(FlightStatus status);

    @EntityGraph(attributePaths = {"user"})
    @Override
    List<FlightSession> findAll(Sort sort);
}