package org.ccpc.skymetrics.controller;

import org.ccpc.skymetrics.dto.FlightDtos.FlightDetailResponse;
import org.ccpc.skymetrics.dto.FlightDtos.FlightSummaryResponse;
import org.ccpc.skymetrics.dto.FlightDtos.PythonAnalysisResponse;
import org.ccpc.skymetrics.entity.FlightSession;
import org.ccpc.skymetrics.security.UserDetailsImpl;
import org.ccpc.skymetrics.service.FlightSessionService;
import org.ccpc.skymetrics.service.PythonIntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/flights")
@RequiredArgsConstructor
public class FlightController {

    private final FlightSessionService sessionService;
    private final PythonIntegrationService pythonService;


    @PostMapping("/upload")
    public ResponseEntity<?> uploadFlightLog(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        FlightSession initialSession = null;
        try {
            initialSession = sessionService.createInitialSession(file.getOriginalFilename(), userDetails.getId());

            PythonAnalysisResponse pythonResponse = pythonService.analyzeLogFile(file);

            if (pythonResponse == null) {
                return ResponseEntity.internalServerError()
                        .body("Python service returned no response");
            }

            FlightDetailResponse result = sessionService.processAndSaveResults(initialSession.getId(), pythonResponse);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            System.err.println("[UPLOAD ERROR] " + e.getClass().getSimpleName() + ": " + e.getMessage());
            if (e.getCause() != null) {
                System.err.println("[UPLOAD CAUSE] " + e.getCause().getMessage());
            }
            return ResponseEntity.internalServerError()
                    .body("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<FlightSummaryResponse>> getMyFlights(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        List<FlightSummaryResponse> flights = sessionService.getUserFlights(userDetails.getId());
        return ResponseEntity.ok(flights);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getFlightDetails(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        try {
            FlightDetailResponse details = sessionService.getFlightDetails(id, userDetails.getId());
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<FlightSummaryResponse>> getAllSystemFlights(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(sessionService.getAllSystemFlights(status));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getFlightDetailsAsAdmin(@PathVariable UUID id) {
        try {
            FlightDetailResponse details = sessionService.getFlightDetailsAsAdmin(id);
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFlight(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        try {
            boolean isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            sessionService.deleteFlight(id, userDetails.getId(), isAdmin);
            return ResponseEntity.ok("Flight deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}