package com.thepersonae.repository;

import com.thepersonae.domain.MediaKind;
import com.thepersonae.domain.ProfileMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProfileMediaRepository extends JpaRepository<ProfileMedia, UUID> {
    @Query("select m from ProfileMedia m join fetch m.profile where m.profile.id = :profileId order by m.sortOrder")
    List<ProfileMedia> findByProfileIdOrderBySortOrderAsc(@Param("profileId") UUID profileId);

    @Query("select m from ProfileMedia m join fetch m.profile where m.profile.id in :profileIds order by m.sortOrder")
    List<ProfileMedia> findByProfileIdInOrderBySortOrderAsc(@Param("profileIds") List<UUID> profileIds);

    long countByKind(MediaKind kind);

    void deleteByProfileId(UUID profileId);
}
