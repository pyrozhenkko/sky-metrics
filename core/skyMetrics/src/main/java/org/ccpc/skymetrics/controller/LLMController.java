package org.ccpc.skymetrics.controller;

import org.ccpc.skymetrics.dto.AiReportResponse;
import org.ccpc.skymetrics.service.PythonIntegrationService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
            return ResponseEntity.ok(pythonIntegrationService.getAiReportFromJson(flightAnalyticsPayload));
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new AiReportResponse(
                            "Помилка LLM-сервісу",
                            "error",
                            msg,
                            List.of(),
                            ""
                    ));
        }
    }
}