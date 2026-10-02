package com.swyp.team5.file.error;

import com.swyp.team5.common.error.LogDetail;

public class FileStorageException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public FileStorageException(String message) {
        this(message, null, null);
    }

    public FileStorageException(String message, String logDetail) {
        this(message, logDetail, null);
    }

    public FileStorageException(String message, String logDetail, Throwable cause) {
        super(message, cause);
        this.logDetail = logDetail;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
