package com.thepersonae.repository;

import com.thepersonae.domain.AccessToken;
import com.thepersonae.domain.TokenPurpose;
import com.thepersonae.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccessTokenRepository extends JpaRepository<AccessToken, UUID> {
    @Query("select t from AccessToken t join fetch t.user where t.token = :token")
    Optional<AccessToken> findByToken(@Param("token") String token);

    List<AccessToken> findByUserAndPurposeAndUsedAtIsNull(UserAccount user, TokenPurpose purpose);

    @Query("select t from AccessToken t join fetch t.user where t.usedAt is null order by t.createdAt desc")
    List<AccessToken> findByUsedAtIsNullOrderByCreatedAtDesc();

    @Query("select t from AccessToken t join fetch t.user where t.user = :user and t.usedAt is null order by t.createdAt desc")
    List<AccessToken> findOpenByUser(@Param("user") UserAccount user);
}
