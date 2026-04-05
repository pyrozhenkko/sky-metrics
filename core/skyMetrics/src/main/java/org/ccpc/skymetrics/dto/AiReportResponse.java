package org.ccpc.skymetrics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiReportResponse(
        String title,
        String overall_status,
        String summary,
        List<AnomalyDto> anomalies,
        String recommendation
) {}