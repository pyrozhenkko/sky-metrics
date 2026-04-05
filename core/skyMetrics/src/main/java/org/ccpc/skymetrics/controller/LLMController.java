package org.ccpc.skymetrics.controller;

import org.ccpc.skymetrics.dto.AiReportResponse;
import org.ccpc.skymetrics.service.PythonIntegrationService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/llm")
public class LLMController {

    private final PythonIntegrationService pythonIntegrationService;

    public LLMController(PythonIntegrationService pythonIntegrationService) {
        this.pythonIntegrationService = pythonIntegrationService;
    }

    @PostMapping("/ai-report")
    public ResponseEntity<Object> generateAiReport(@RequestBody JsonNode flightAnalyticsPayload) {
        try {
            AiReportResponse report = pythonIntegrationService.getAiReportFromJson(flightAnalyticsPayload);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500).body(
                    java.util.Map.of(
                            "error", e.getMessage(),
                            "cause", e.getCause() != null ? e.getCause().toString() : "Немає деталей"
                    )
            );
        }
    }
}