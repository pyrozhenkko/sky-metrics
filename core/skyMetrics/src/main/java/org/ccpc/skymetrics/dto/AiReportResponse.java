package org.ccpc.skymetrics.dto;

import java.util.List;

public record AiReportResponse(
        String title,
        String overall_status,
        String summary,
        List<AnomalyDto> anomalies,
        String recommendation
) {}