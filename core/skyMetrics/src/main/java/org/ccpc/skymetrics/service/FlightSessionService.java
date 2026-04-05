package org.ccpc.skymetrics.service;

import org.ccpc.skymetrics.dto.FlightDtos.*;
import org.ccpc.skymetrics.entity.*;
import org.ccpc.skymetrics.mapper.FlightMapper;
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
    private final FlightMapper flightMapper;

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

        FlightMetrics metrics = flightMapper.toEntity(data.metrics());
        TrajectoryData trajectoryData = flightMapper.toEntity(data.trajectory());

        session.setMetrics(metrics);
        session.setTrajectory(trajectoryData);
        session.setMetaJson(pythonResponse.meta());
        session.setMethodologyJson(data.methodology());

        String anomaliesStr = "";
        if (pythonResponse.missionAnalysis() != null && pythonResponse.missionAnalysis().anomalies() != null) {
            anomaliesStr = String.join("\n", pythonResponse.missionAnalysis().anomalies());
        }
        session.setAiSummary(anomaliesStr);
        session.setStatus(FlightStatus.COMPLETED);

        FlightSession savedSession = sessionRepository.save(session);

        return buildDetailResponse(savedSession);
    }

    @Transactional(readOnly = true)
    public List<FlightSummaryResponse> getUserFlights(Long userId) {
        return sessionRepository.findAllByUserIdOrderByUploadedAtDesc(userId)
                .stream()
                .map(flightMapper::toSummaryResponse)
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
                .map(flightMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteFlight(UUID sessionId, Long currentUserId, boolean isAdmin) {
        FlightSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!isAdmin && !session.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Access denied");
        }

        try {
            fileStorageService.delete(session.getId(), session.getOriginalFilename());
        } catch (Exception e) {
        }

        sessionRepository.delete(session);
    }

    @Transactional(readOnly = true)
    public FlightDetailResponse getFlightDetailsAsAdmin(UUID sessionId) {
        FlightSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return buildDetailResponse(session);
    }

    private FlightDetailResponse buildDetailResponse(FlightSession session) {
        return flightMapper.toDetailResponse(session);
    }
}