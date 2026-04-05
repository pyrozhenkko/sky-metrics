package org.ccpc.skymetrics.dto;

public record AnomalyDto(
        String component,
        String issue,
        String severity,
        String action_required
) {}