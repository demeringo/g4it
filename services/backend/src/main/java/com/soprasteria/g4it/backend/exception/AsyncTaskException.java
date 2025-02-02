/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */
package com.soprasteria.g4it.backend.exception;

public class AsyncTaskException extends RuntimeException {
    public AsyncTaskException(String message) {
        super(message);
    }

    public AsyncTaskException(String message, Throwable cause) {
        super(message, cause);
    }
}
