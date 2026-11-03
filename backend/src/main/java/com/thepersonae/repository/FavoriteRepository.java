package com.thepersonae.repository;

import com.thepersonae.domain.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FavoriteRepository extends JpaRepository<Favorite, Favorite.Key> {
    boolean existsByUserIdAndProfileId(UUID userId, UUID profileId);

    List<Favorite> findByUserId(UUID userId);

    void deleteByUserIdAndProfileId(UUID userId, UUID profileId);

    void deleteByProfileId(UUID profileId);
}
