package org.ccpc.skymetrics.service;

import org.ccpc.skymetrics.dto.AiReportResponse;
import org.ccpc.skymetrics.dto.FlightDtos.PythonAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class PythonIntegrationService {

    private final RestTemplate restTemplate;

    @Value("${python.service.url:http://localhost:5000/api/analyze}")
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
        MultipartBodyBuilder builder = new MultipartBodyBuilder();

        byte[] jsonBytes = flightDataJson.toString().getBytes(StandardCharsets.UTF_8);

        builder.part("file", jsonBytes, MediaType.APPLICATION_JSON)
                .filename("payload.json");

        return webClient.post()
                .uri("/call_llm")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(AiReportResponse.class)
                .block();
    }
}