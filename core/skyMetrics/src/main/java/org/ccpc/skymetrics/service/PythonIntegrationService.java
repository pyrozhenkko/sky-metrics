package org.ccpc.skymetrics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.ccpc.skymetrics.dto.AiReportResponse;
import org.ccpc.skymetrics.dto.FlightDtos.PythonAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class PythonIntegrationService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${python.service.url:http://localhost:8000/analyze}")
    private String pythonUrl;

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
        String llmEndpoint = resolveCallLlmUrl();
        try {
            byte[] jsonBytes = objectMapper.writeValueAsBytes(flightDataJson);
            ByteArrayResource filePart = new ByteArrayResource(jsonBytes) {
                @Override
                public String getFilename() {
                    return "flight.json";
                }
            };

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<AiReportResponse> response = restTemplate.postForEntity(
                    llmEndpoint,
                    request,
                    AiReportResponse.class
            );
            AiReportResponse r = response.getBody();
            if (r == null) {
                throw new IllegalStateException("Empty LLM response body");
            }
            return r;
        } catch (RestClientException e) {
            throw new IllegalStateException("LLM service request failed: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IllegalStateException("LLM integration error: " + e.getMessage(), e);
        }
    }

    private String resolveCallLlmUrl() {
        String u = pythonUrl == null ? "" : pythonUrl.trim();
        if (u.endsWith("/analyze")) {
            return u.substring(0, u.length() - "/analyze".length()) + "/call_llm";
        }
        if (u.endsWith("/")) {
            return u + "call_llm";
        }
        int lastSlash = u.lastIndexOf('/');
        if (lastSlash > 0) {
            return u.substring(0, lastSlash) + "/call_llm";
        }
        return u + "/call_llm";
    }
}
