package com.swyp.team5.platform.verification.dto;

public record IdentityLoginResult(String sessionToken, boolean newAccount) {

    @Override
    public String toString() {
        return "IdentityLoginResult[newAccount=" + newAccount + "]";
    }
}
