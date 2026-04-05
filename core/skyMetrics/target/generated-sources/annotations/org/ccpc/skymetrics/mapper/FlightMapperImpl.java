package org.ccpc.skymetrics.mapper;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.ccpc.skymetrics.dto.FlightDtos;
import org.ccpc.skymetrics.entity.FlightMetrics;
import org.ccpc.skymetrics.entity.FlightSession;
import org.ccpc.skymetrics.entity.TrajectoryData;
import org.ccpc.skymetrics.entity.User;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-05T21:02:45+0300",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class FlightMapperImpl implements FlightMapper {

    @Override
    public FlightDtos.FlightSummaryResponse toSummaryResponse(FlightSession session) {
        if ( session == null ) {
            return null;
        }

        Long userId = null;
        String username = null;
        String ownerEmail = null;
        UUID id = null;
        String originalFilename = null;
        LocalDateTime uploadedAt = null;

        userId = sessionUserId( session );
        username = sessionUserUsername( session );
        ownerEmail = sessionUserEmail( session );
        id = session.getId();
        originalFilename = session.getOriginalFilename();
        uploadedAt = session.getUploadedAt();

        String status = session.getStatus().name();

        FlightDtos.FlightSummaryResponse flightSummaryResponse = new FlightDtos.FlightSummaryResponse( id, originalFilename, uploadedAt, status, userId, username, ownerEmail );

        return flightSummaryResponse;
    }

    @Override
    public FlightDtos.FlightDetailResponse toDetailResponse(FlightSession session) {
        if ( session == null ) {
            return null;
        }

        JsonNode meta = null;
        JsonNode methodology = null;
        UUID id = null;
        String originalFilename = null;
        LocalDateTime uploadedAt = null;
        String aiSummary = null;
        FlightDtos.MetricsDto metrics = null;
        FlightDtos.TrajectoryDto trajectory = null;

        meta = session.getMetaJson();
        methodology = session.getMethodologyJson();
        id = session.getId();
        originalFilename = session.getOriginalFilename();
        uploadedAt = session.getUploadedAt();
        aiSummary = session.getAiSummary();
        metrics = flightMetricsToMetricsDto( session.getMetrics() );
        trajectory = trajectoryDataToTrajectoryDto( session.getTrajectory() );

        String status = session.getStatus().name();

        FlightDtos.FlightDetailResponse flightDetailResponse = new FlightDtos.FlightDetailResponse( id, originalFilename, uploadedAt, status, aiSummary, metrics, trajectory, meta, methodology );

        return flightDetailResponse;
    }

    @Override
    public FlightMetrics toEntity(FlightDtos.MetricsDto dto) {
        if ( dto == null ) {
            return null;
        }

        FlightMetrics.FlightMetricsBuilder flightMetrics = FlightMetrics.builder();

        flightMetrics.altitudeGainM( dto.altitudeGainM() );
        flightMetrics.flightDurationSec( dto.flightDurationSec() );
        flightMetrics.maxAccelerationMs2( dto.maxAccelerationMs2() );
        flightMetrics.maxAltitudeM( dto.maxAltitudeM() );
        flightMetrics.maxHorizontalSpeedMs( dto.maxHorizontalSpeedMs() );
        flightMetrics.maxSpeedFromImuTrapzMs( dto.maxSpeedFromImuTrapzMs() );
        flightMetrics.maxVerticalSpeedMs( dto.maxVerticalSpeedMs() );
        flightMetrics.totalDistanceM( dto.totalDistanceM() );

        return flightMetrics.build();
    }

    @Override
    public TrajectoryData.ReferenceData toEntity(FlightDtos.ReferenceDto dto) {
        if ( dto == null ) {
            return null;
        }

        TrajectoryData.ReferenceData referenceData = new TrajectoryData.ReferenceData();

        referenceData.setLat0_deg( dto.lat0Deg() );
        referenceData.setLon0_deg( dto.lon0Deg() );
        referenceData.setAlt0_m( dto.alt0M() );
        referenceData.setFrame( dto.frame() );

        return referenceData;
    }

    @Override
    public FlightDtos.ReferenceDto toDto(TrajectoryData.ReferenceData entity) {
        if ( entity == null ) {
            return null;
        }

        Double lat0Deg = null;
        Double lon0Deg = null;
        Double alt0M = null;
        String frame = null;

        lat0Deg = entity.getLat0_deg();
        lon0Deg = entity.getLon0_deg();
        alt0M = entity.getAlt0_m();
        frame = entity.getFrame();

        FlightDtos.ReferenceDto referenceDto = new FlightDtos.ReferenceDto( lat0Deg, lon0Deg, alt0M, frame );

        return referenceDto;
    }

    @Override
    public TrajectoryData toEntity(FlightDtos.TrajectoryDto dto) {
        if ( dto == null ) {
            return null;
        }

        TrajectoryData trajectoryData = new TrajectoryData();

        List<Double> list = dto.alt_m();
        if ( list != null ) {
            trajectoryData.setAlt_m( new ArrayList<Double>( list ) );
        }
        List<Double> list1 = dto.lat_deg();
        if ( list1 != null ) {
            trajectoryData.setLat_deg( new ArrayList<Double>( list1 ) );
        }
        List<Double> list2 = dto.lon_deg();
        if ( list2 != null ) {
            trajectoryData.setLon_deg( new ArrayList<Double>( list2 ) );
        }
        trajectoryData.setReference( toEntity( dto.reference() ) );
        List<Double> list3 = dto.speed_horizontal_m_s();
        if ( list3 != null ) {
            trajectoryData.setSpeed_horizontal_m_s( new ArrayList<Double>( list3 ) );
        }
        List<Double> list4 = dto.time();
        if ( list4 != null ) {
            trajectoryData.setTime( new ArrayList<Double>( list4 ) );
        }
        List<Double> list5 = dto.x_east();
        if ( list5 != null ) {
            trajectoryData.setX_east( new ArrayList<Double>( list5 ) );
        }
        List<Double> list6 = dto.y_north();
        if ( list6 != null ) {
            trajectoryData.setY_north( new ArrayList<Double>( list6 ) );
        }
        List<Double> list7 = dto.z_up();
        if ( list7 != null ) {
            trajectoryData.setZ_up( new ArrayList<Double>( list7 ) );
        }

        return trajectoryData;
    }

    private Long sessionUserId(FlightSession flightSession) {
        if ( flightSession == null ) {
            return null;
        }
        User user = flightSession.getUser();
        if ( user == null ) {
            return null;
        }
        Long id = user.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }

    private String sessionUserUsername(FlightSession flightSession) {
        if ( flightSession == null ) {
            return null;
        }
        User user = flightSession.getUser();
        if ( user == null ) {
            return null;
        }
        String username = user.getUsername();
        if ( username == null ) {
            return null;
        }
        return username;
    }

    private String sessionUserEmail(FlightSession flightSession) {
        if ( flightSession == null ) {
            return null;
        }
        User user = flightSession.getUser();
        if ( user == null ) {
            return null;
        }
        String email = user.getEmail();
        if ( email == null ) {
            return null;
        }
        return email;
    }

    protected FlightDtos.MetricsDto flightMetricsToMetricsDto(FlightMetrics flightMetrics) {
        if ( flightMetrics == null ) {
            return null;
        }

        Double flightDurationSec = null;
        Double totalDistanceM = null;
        Double maxAltitudeM = null;
        Double altitudeGainM = null;
        Double maxHorizontalSpeedMs = null;
        Double maxVerticalSpeedMs = null;
        Double maxAccelerationMs2 = null;
        Double maxSpeedFromImuTrapzMs = null;

        flightDurationSec = flightMetrics.getFlightDurationSec();
        totalDistanceM = flightMetrics.getTotalDistanceM();
        maxAltitudeM = flightMetrics.getMaxAltitudeM();
        altitudeGainM = flightMetrics.getAltitudeGainM();
        maxHorizontalSpeedMs = flightMetrics.getMaxHorizontalSpeedMs();
        maxVerticalSpeedMs = flightMetrics.getMaxVerticalSpeedMs();
        maxAccelerationMs2 = flightMetrics.getMaxAccelerationMs2();
        maxSpeedFromImuTrapzMs = flightMetrics.getMaxSpeedFromImuTrapzMs();

        FlightDtos.MetricsDto metricsDto = new FlightDtos.MetricsDto( flightDurationSec, totalDistanceM, maxAltitudeM, altitudeGainM, maxHorizontalSpeedMs, maxVerticalSpeedMs, maxAccelerationMs2, maxSpeedFromImuTrapzMs );

        return metricsDto;
    }

    protected FlightDtos.TrajectoryDto trajectoryDataToTrajectoryDto(TrajectoryData trajectoryData) {
        if ( trajectoryData == null ) {
            return null;
        }

        FlightDtos.ReferenceDto reference = null;
        List<Double> time = null;
        List<Double> lat_deg = null;
        List<Double> lon_deg = null;
        List<Double> alt_m = null;
        List<Double> x_east = null;
        List<Double> y_north = null;
        List<Double> z_up = null;
        List<Double> speed_horizontal_m_s = null;

        reference = toDto( trajectoryData.getReference() );
        List<Double> list = trajectoryData.getTime();
        if ( list != null ) {
            time = new ArrayList<Double>( list );
        }
        List<Double> list1 = trajectoryData.getLat_deg();
        if ( list1 != null ) {
            lat_deg = new ArrayList<Double>( list1 );
        }
        List<Double> list2 = trajectoryData.getLon_deg();
        if ( list2 != null ) {
            lon_deg = new ArrayList<Double>( list2 );
        }
        List<Double> list3 = trajectoryData.getAlt_m();
        if ( list3 != null ) {
            alt_m = new ArrayList<Double>( list3 );
        }
        List<Double> list4 = trajectoryData.getX_east();
        if ( list4 != null ) {
            x_east = new ArrayList<Double>( list4 );
        }
        List<Double> list5 = trajectoryData.getY_north();
        if ( list5 != null ) {
            y_north = new ArrayList<Double>( list5 );
        }
        List<Double> list6 = trajectoryData.getZ_up();
        if ( list6 != null ) {
            z_up = new ArrayList<Double>( list6 );
        }
        List<Double> list7 = trajectoryData.getSpeed_horizontal_m_s();
        if ( list7 != null ) {
            speed_horizontal_m_s = new ArrayList<Double>( list7 );
        }

        FlightDtos.TrajectoryDto trajectoryDto = new FlightDtos.TrajectoryDto( reference, time, lat_deg, lon_deg, alt_m, x_east, y_north, z_up, speed_horizontal_m_s );

        return trajectoryDto;
    }
}
