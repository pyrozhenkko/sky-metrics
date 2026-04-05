package org.ccpc.skymetrics.service;

import org.ccpc.skymetrics.dto.AiReportResponse;
import org.ccpc.skymetrics.dto.FlightDtos.PythonAnalysisResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class PythonIntegrationService {

    private final RestTemplate restTemplate;
    private final WebClient webClient;

    @Value("${python.service.url:http://localhost:8000/api/analyze}")
    private String pythonUrl;

    @Value("${python.service.llm.url:http://localhost:8000/api/call_llm}")
    private String pythonLlmUrl;

    public PythonIntegrationService(RestTemplate restTemplate, WebClient.Builder webClientBuilder) {
        this.restTemplate = restTemplate;
        this.webClient = webClientBuilder.build();
    }

    public PythonAnalysisResponse analyzeLogFile(MultipartFile file) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", file.getResource());

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<PythonAnalysisResponse> response = restTemplate.postForEntity(
                    pythonUrl,
                    requestEntity,
                    PythonAnalysisResponse.class
            );

            return response.getBody();
        } catch (Exception e) {
            return new PythonAnalysisResponse("error", null, null, null, e.getMessage());
        }
    }

    public AiReportResponse getAiReportFromJson(JsonNode flightDataJson) {
        try {
            return webClient.post()
                    .uri(pythonLlmUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(flightDataJson)
                    .retrieve()
                    .bodyToMono(AiReportResponse.class)
                    .block();
        } catch (Exception e) {
            throw new RuntimeException("Error Python LLM: " + e.getMessage(), e);
        }
    }
}