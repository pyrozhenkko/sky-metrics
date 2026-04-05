package org.ccpc.skymetrics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AnomalyDto(
        String component,
        String issue,
        String severity,
        String action_required
) {}