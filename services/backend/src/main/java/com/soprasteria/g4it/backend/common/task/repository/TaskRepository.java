/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */

package com.soprasteria.g4it.backend.common.task.repository;

import com.soprasteria.g4it.backend.apiinventory.modeldb.Inventory;
import com.soprasteria.g4it.backend.common.task.modeldb.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Task repository.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByStatusAndType(final String status, final String type);

    List<Task> findByInventoryAndStatusAndType(final Inventory inventory, final String status, final String type);

    Optional<Task> findByDigitalServiceUid(final String digitalServiceUid);

    /**
     * Find by inventory id
     *
     * @param inventory inventory
     * @return task linked to inventory id
     */
    @Query("""
            SELECT t FROM Task t
            WHERE t.inventory = :inventory
            ORDER BY creationDate DESC LIMIT 1
            """)
    Optional<Task> findByInventoryAndLastCreationDate(@Param("inventory") final Inventory inventory);

}