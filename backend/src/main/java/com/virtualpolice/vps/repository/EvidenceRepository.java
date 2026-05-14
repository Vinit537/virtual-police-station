package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.EvidenceFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface EvidenceRepository extends JpaRepository<EvidenceFile, Long> {
    List<EvidenceFile> findByFirId(Long firId);
    void deleteByFirIdIn(Collection<Long> firIds);
}
