package com.studentportal.complaints.controller;

import com.studentportal.complaints.model.Complaint;
import com.studentportal.complaints.model.ComplaintStatus;
import com.studentportal.complaints.repository.ComplaintRepository;
import com.studentportal.complaints.security.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class ComplaintController {
    private static final int MAX_TRACKED_IDS = 20;
    private static final int MAX_FAILED_LOGINS = 5;
    private static final long LOGIN_WINDOW_MS = 15 * 60_000L;
    private static final int MAX_SUBMISSIONS = 5;
    private static final long SUBMISSION_WINDOW_MS = 60 * 60_000L;

    private final ComplaintRepository repository;
    private final RateLimiter rateLimiter;
    private final String adminPassword;

    public ComplaintController(ComplaintRepository repository,
                               RateLimiter rateLimiter,
                               @Value("${app.admin.password:}") String adminPassword) {
        this.repository = repository;
        this.rateLimiter = rateLimiter;
        this.adminPassword = adminPassword;
    }

    /** Admin only: every complaint. Also used by the dashboard to verify the password. */
    @GetMapping
    public List<Complaint> getAllComplaints(@RequestHeader(value = "X-Admin-Password", required = false) String password,
                                            HttpServletRequest http) {
        requireAdmin(password, http.getRemoteAddr());
        return repository.findAllByOrderByCreatedAtDesc();
    }

    /** Public: a student can look up only the complaints whose ids they submitted. */
    @GetMapping("/track")
    public List<Complaint> trackComplaints(@RequestParam List<Long> ids) {
        if (ids.size() > MAX_TRACKED_IDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many ids");
        }
        return repository.findAllById(ids).stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Complaint createComplaint(@Valid @RequestBody CreateComplaintRequest request, HttpServletRequest http) {
        String key = "submit:" + http.getRemoteAddr();
        if (rateLimiter.isBlocked(key, MAX_SUBMISSIONS, SUBMISSION_WINDOW_MS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "You have submitted several complaints recently. Please try again later.");
        }
        Complaint complaint = new Complaint();
        complaint.setStudentName(request.studentName().trim());
        complaint.setStudentEmail(request.studentEmail().trim());
        complaint.setSubject(request.subject().trim());
        complaint.setDescription(request.description().trim());
        complaint.setStatus(ComplaintStatus.YET_TO_BE_REVIEWED);
        Complaint saved = repository.save(complaint);
        rateLimiter.record(key);
        return saved;
    }

    /** Admin only. */
    @PatchMapping("/{id}/status")
    public Complaint updateStatus(@PathVariable Long id,
                                  @Valid @RequestBody UpdateStatusRequest request,
                                  @RequestHeader(value = "X-Admin-Password", required = false) String password,
                                  HttpServletRequest http) {
        requireAdmin(password, http.getRemoteAddr());
        Complaint complaint = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        complaint.setStatus(request.status());
        return repository.save(complaint);
    }

    private void requireAdmin(String password, String clientIp) {
        if (adminPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is not configured");
        }
        String key = "login:" + clientIp;
        if (rateLimiter.isBlocked(key, MAX_FAILED_LOGINS, LOGIN_WINDOW_MS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Too many failed attempts. Please wait 15 minutes and try again.");
        }
        boolean ok = password != null && MessageDigest.isEqual(
            password.getBytes(StandardCharsets.UTF_8), adminPassword.getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            rateLimiter.record(key);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin password");
        }
        rateLimiter.clear(key);
    }

    public record CreateComplaintRequest(
        @NotBlank @Size(max = 100) String studentName,
        @NotBlank @Email @Size(max = 150) String studentEmail,
        @NotBlank @Size(max = 150) String subject,
        @NotBlank @Size(min = 10, max = 3000) String description
    ) {}

    public record UpdateStatusRequest(@NotNull ComplaintStatus status) {}
}
