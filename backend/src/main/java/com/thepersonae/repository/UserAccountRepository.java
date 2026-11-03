package com.thepersonae.repository;

import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<UserAccount> findAllByOrderByCreatedAtDesc();

    List<UserAccount> findByStatusOrderByCreatedAtDesc(AccountStatus status);

    long countByStatus(AccountStatus status);
}
