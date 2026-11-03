package com.thepersonae.repository;

import com.thepersonae.domain.Availability;
import com.thepersonae.domain.CompanionProfile;
import com.thepersonae.domain.Tier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CompanionProfileRepository extends JpaRepository<CompanionProfile, UUID> {

    @Query("""
            select p from CompanionProfile p
            where (:includeHidden = true or p.visible = true)
              and (:q = '' or lower(p.name) like lower(concat('%', :q, '%'))
                   or lower(p.city) like lower(concat('%', :q, '%')))
              and (:availability is null or p.availability = :availability)
              and (:tier is null or p.tier = :tier)
            order by p.updatedAt desc
            """)
    List<CompanionProfile> search(
            @Param("q") String q,
            @Param("availability") Availability availability,
            @Param("tier") Tier tier,
            @Param("includeHidden") boolean includeHidden
    );

    long countByVisible(boolean visible);
}
