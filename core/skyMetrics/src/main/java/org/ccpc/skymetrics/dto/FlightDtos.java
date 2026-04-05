package org.ccpc.skymetrics.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class FlightDtos {

    public record FlightSummaryResponse(
            UUID id,
            String originalFilename,
            LocalDateTime uploadedAt,
            String status
    ) {}

    public record FlightDetailResponse(
            UUID id,
            String originalFilename,
            LocalDateTime uploadedAt,
            String status,
            String aiSummary,
            MetricsDto metrics,
            TrajectoryDto trajectory
    ) {}

    public record MetricsDto(
            Double flightDurationSec,
            Double totalDistanceM,
            Double maxAltitudeM,
            Double maxHorizontalSpeedMs,
            Double maxVerticalSpeedMs,
            Double maxAccelerationMs2
    ) {}

    public record TrajectoryDto(
            List<Double> time,
            List<Double> x_east,
            List<Double> y_north,
            List<Double> z_up
    ) {}

    public record PythonAnalysisResponse(
            String status,
            PythonData data,
            String errorMessage
    ) {}

    public record PythonData(
            MetricsDto metrics,
            TrajectoryDto trajectory,
            String aiSummary
    ) {}
}