package com.swyp.team5.platform.bunjang.dto;

public record BunjangIdentityLoginResult(String sessionToken, boolean newAccount) {

    @Override
    public String toString() {
        return "BunjangIdentityLoginResult[newAccount=" + newAccount + "]";
    }
}
