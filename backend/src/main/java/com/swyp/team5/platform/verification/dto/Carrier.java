package com.swyp.team5.platform.verification.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Carrier {
    SKT("SKT"),
    KT("KT"),
    LG_U_PLUS("LG U+"),
    SKT_MVNO("SKT 알뜰폰"),
    KT_MVNO("KT 알뜰폰"),
    LG_U_PLUS_MVNO("LG U+ 알뜰폰");

    private final String label;
}
