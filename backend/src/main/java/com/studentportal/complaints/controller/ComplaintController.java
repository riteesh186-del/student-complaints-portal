package com.studentportal.complaints.controller;

import com.studentportal.complaints.model.Complaint;
import com.studentportal.complaints.model.ComplaintStatus;
import com.studentportal.complaints.repository.ComplaintRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class ComplaintController {
    private final ComplaintRepository repository;

    public ComplaintController(ComplaintRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Complaint> getAllComplaints() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Complaint createComplaint(@Valid @RequestBody CreateComplaintRequest request) {
        Complaint complaint = new Complaint();
        complaint.setStudentName(request.studentName().trim());
        complaint.setStudentEmail(request.studentEmail().trim());
        complaint.setSubject(request.subject().trim());
        complaint.setDescription(request.description().trim());
        complaint.setStatus(ComplaintStatus.YET_TO_BE_REVIEWED);
        return repository.save(complaint);
    }

    @PatchMapping("/{id}/status")
    public Complaint updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request) {
        Complaint complaint = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        complaint.setStatus(request.status());
        return repository.save(complaint);
    }

    public record CreateComplaintRequest(
        @NotBlank @Size(max = 100) String studentName,
        @NotBlank @Email @Size(max = 150) String studentEmail,
        @NotBlank @Size(max = 150) String subject,
        @NotBlank @Size(max = 3000) String description
    ) {}

    public record UpdateStatusRequest(ComplaintStatus status) {}
}
