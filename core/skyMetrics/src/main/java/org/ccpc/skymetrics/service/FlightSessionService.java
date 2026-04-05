package org.ccpc.skymetrics.service;

import org.ccpc.skymetrics.dto.FlightDtos.*;
import org.ccpc.skymetrics.entity.*;
import org.ccpc.skymetrics.repository.FlightSessionRepository;
import org.ccpc.skymetrics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlightSessionService {

    private final FlightSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public FlightSession createInitialSession(String filename, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        FlightSession session = FlightSession.builder()
                .originalFilename(filename)
                .status(FlightStatus.PROCESSING)
                .user(user)
                .build();

        return sessionRepository.save(session);
    }

    @Transactional
    public FlightDetailResponse processAndSaveResults(UUID sessionId, PythonAnalysisResponse pythonResponse) {
        FlightSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if ("error".equalsIgnoreCase(pythonResponse.status()) || pythonResponse.data() == null) {
            session.setStatus(FlightStatus.FAILED);
            session.setAiSummary(pythonResponse.errorMessage());
            sessionRepository.save(session);
            throw new RuntimeException("Python processing failed: " + pythonResponse.errorMessage());
        }

        PythonData data = pythonResponse.data();

        FlightMetrics metrics = FlightMetrics.builder()
                .flightDurationSec(data.metrics().flightDurationSec())
                .totalDistanceM(data.metrics().totalDistanceM())
                .maxAltitudeM(data.metrics().maxAltitudeM())
                .maxHorizontalSpeedMs(data.metrics().maxHorizontalSpeedMs())
                .maxVerticalSpeedMs(data.metrics().maxVerticalSpeedMs())
                .maxAccelerationMs2(data.metrics().maxAccelerationMs2())
                .build();

        TrajectoryData trajectoryData = new TrajectoryData(
                data.trajectory().time(),
                data.trajectory().x_east(),
                data.trajectory().y_north(),
                data.trajectory().z_up()
        );

        session.setMetrics(metrics);
        session.setTrajectory(trajectoryData);
        session.setAiSummary(data.aiSummary());
        session.setStatus(FlightStatus.COMPLETED);

        FlightSession savedSession = sessionRepository.save(session);

        return buildDetailResponse(savedSession);
    }

    @Transactional(readOnly = true)
    public List<FlightSummaryResponse> getUserFlights(Long userId) {
        return sessionRepository.findAllByUserIdOrderByUploadedAtDesc(userId)
                .stream()
                .map(s -> new FlightSummaryResponse(s.getId(), s.getOriginalFilename(), s.getUploadedAt(), s.getStatus().name()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FlightDetailResponse getFlightDetails(UUID sessionId, Long userId) {
        FlightSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }

        return buildDetailResponse(session);
    }

    // ==========================================
    // БІЗНЕС-ЛОГІКА ДЛЯ АДМІНІСТРАТОРА (ROLE_ADMIN)
    // ==========================================

    @Transactional(readOnly = true)
    public List<FlightSummaryResponse> getAllSystemFlights(String status) {
        List<FlightSession> sessions;
        if (status != null && !status.isEmpty()) {
            try {
                FlightStatus flightStatus = FlightStatus.valueOf(status.toUpperCase());
                sessions = sessionRepository.findAllByStatusOrderByUploadedAtDesc(flightStatus);
            } catch (IllegalArgumentException e) {
                sessions = sessionRepository.findAll(Sort.by(Sort.Direction.DESC, "uploadedAt"));
            }
        } else {
            sessions = sessionRepository.findAll(Sort.by(Sort.Direction.DESC, "uploadedAt"));
        }

        return sessions.stream()
                .map(s -> new FlightSummaryResponse(s.getId(), s.getOriginalFilename(), s.getUploadedAt(), s.getStatus().name()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteFlight(UUID sessionId, Long currentUserId, boolean isAdmin) {
        FlightSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!isAdmin && !session.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Access denied");
        }

        // Delete physical file
        try {
            fileStorageService.delete(session.getId(), session.getOriginalFilename());
        } catch (Exception e) {
            // Ignore if file doesn't exist to not fail DB deletion
        }

        sessionRepository.delete(session);
    }

    @Transactional(readOnly = true)
    public FlightDetailResponse getFlightDetailsAsAdmin(UUID sessionId) {
        FlightSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        // Адмін не має перевірки на userId, тому бачить все
        return buildDetailResponse(session);
    }

    private FlightDetailResponse buildDetailResponse(FlightSession session) {
        MetricsDto metricsDto = null;
        if (session.getMetrics() != null) {
            metricsDto = new MetricsDto(
                    session.getMetrics().getFlightDurationSec(),
                    session.getMetrics().getTotalDistanceM(),
                    session.getMetrics().getMaxAltitudeM(),
                    session.getMetrics().getMaxHorizontalSpeedMs(),
                    session.getMetrics().getMaxVerticalSpeedMs(),
                    session.getMetrics().getMaxAccelerationMs2()
            );
        }

        TrajectoryDto trajectoryDto = null;
        if (session.getTrajectory() != null) {
            trajectoryDto = new TrajectoryDto(
                    session.getTrajectory().getTime(),
                    session.getTrajectory().getX_east(),
                    session.getTrajectory().getY_north(),
                    session.getTrajectory().getZ_up()
            );
        }

        return new FlightDetailResponse(
                session.getId(),
                session.getOriginalFilename(),
                session.getUploadedAt(),
                session.getStatus().name(),
                session.getAiSummary(),
                metricsDto,
                trajectoryDto
        );
    }
}