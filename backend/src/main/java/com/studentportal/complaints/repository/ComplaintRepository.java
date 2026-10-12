package com.studentportal.complaints.repository;

import com.studentportal.complaints.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findAllByOrderByCreatedAtDesc();

    Optional<Complaint> findByIdAndStudentEmailIgnoreCase(Long id, String studentEmail);
}
