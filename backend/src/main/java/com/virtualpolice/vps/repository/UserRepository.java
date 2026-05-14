package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.Role;
import com.virtualpolice.vps.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByAadhaarNumber(String aadhaarNumber);
    boolean existsByEmail(String email);
    List<UserAccount> findByRoleIn(Collection<Role> roles);
}
