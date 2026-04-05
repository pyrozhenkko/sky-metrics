package org.ccpc.skymetrics.mapper;

import org.ccpc.skymetrics.dto.FlightDtos.FlightDetailResponse;
import org.ccpc.skymetrics.dto.FlightDtos.FlightSummaryResponse;
import org.ccpc.skymetrics.dto.FlightDtos.MetricsDto;
import org.ccpc.skymetrics.dto.FlightDtos.TrajectoryDto;
import org.ccpc.skymetrics.dto.FlightDtos.ReferenceDto;
import org.ccpc.skymetrics.entity.FlightMetrics;
import org.ccpc.skymetrics.entity.FlightSession;
import org.ccpc.skymetrics.entity.TrajectoryData;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FlightMapper {

    @Mapping(target = "status", expression = "java(session.getStatus().name())")
    FlightSummaryResponse toSummaryResponse(FlightSession session);

    @Mapping(target = "status", expression = "java(session.getStatus().name())")
    @Mapping(source = "metaJson", target = "meta")
    @Mapping(source = "methodologyJson", target = "methodology")
    FlightDetailResponse toDetailResponse(FlightSession session);

    FlightMetrics toEntity(MetricsDto dto);

    @Mapping(source = "lat0Deg", target = "lat0_deg")
    @Mapping(source = "lon0Deg", target = "lon0_deg")
    @Mapping(source = "alt0M", target = "alt0_m")
    TrajectoryData.ReferenceData toEntity(ReferenceDto dto);

    @Mapping(source = "lat0_deg", target = "lat0Deg")
    @Mapping(source = "lon0_deg", target = "lon0Deg")
    @Mapping(source = "alt0_m", target = "alt0M")
    ReferenceDto toDto(TrajectoryData.ReferenceData entity);

    TrajectoryData toEntity(TrajectoryDto dto);
}
