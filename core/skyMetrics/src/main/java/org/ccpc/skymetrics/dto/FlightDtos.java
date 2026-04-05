package org.ccpc.skymetrics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

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
            TrajectoryDto trajectory,
            JsonNode meta,
            JsonNode methodology
    ) {}

    public record MetricsDto(
            @JsonProperty("flight_duration_sec") Double flightDurationSec,
            @JsonProperty("total_distance_m") Double totalDistanceM,
            @JsonProperty("max_altitude_m") Double maxAltitudeM,
            @JsonProperty("altitude_gain_m") Double altitudeGainM,
            @JsonProperty("max_horizontal_speed_m_s") Double maxHorizontalSpeedMs,
            @JsonProperty("max_vertical_speed_m_s") Double maxVerticalSpeedMs,
            @JsonProperty("max_acceleration_m_s2") Double maxAccelerationMs2,
            @JsonProperty("max_speed_from_imu_trapz_m_s") Double maxSpeedFromImuTrapzMs
    ) {}

    public record ReferenceDto(
            @JsonProperty("lat0_deg") Double lat0Deg,
            @JsonProperty("lon0_deg") Double lon0Deg,
            @JsonProperty("alt0_m") Double alt0M,
            @JsonProperty("frame") String frame
    ) {}

    public record TrajectoryDto(
            @JsonProperty("reference") ReferenceDto reference,
            @JsonProperty("time_s") List<Double> time,
            @JsonProperty("lat_deg") List<Double> lat_deg,
            @JsonProperty("lon_deg") List<Double> lon_deg,
            @JsonProperty("alt_m") List<Double> alt_m,
            @JsonProperty("x_east_m") List<Double> x_east,
            @JsonProperty("y_north_m") List<Double> y_north,
            @JsonProperty("z_up_m") List<Double> z_up,
            @JsonProperty("speed_horizontal_m_s") List<Double> speed_horizontal_m_s
    ) {}

    public record MissionAnalysisDto(
            @JsonProperty("mission_status") String missionStatus,
            @JsonProperty("anomalies") List<String> anomalies
    ) {}

    public record PythonAnalysisResponse(
            String status,
            JsonNode meta,
            @JsonProperty("mission_analysis") MissionAnalysisDto missionAnalysis,
            PythonData data,
            String errorMessage
    ) {}

    public record PythonData(
            MetricsDto metrics,
            TrajectoryDto trajectory,
            JsonNode methodology
    ) {}
}