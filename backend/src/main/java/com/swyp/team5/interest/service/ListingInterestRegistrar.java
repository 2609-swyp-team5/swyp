package com.swyp.team5.interest.service;

import org.springframework.stereotype.Component;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.error.InterestAlreadyExistsException;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.error.PlatformListingNotFoundException;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.dto.ListingSource;

/** 외부 플랫폼(번개장터 등) 수집 매물을 관심상품으로 등록하는 전략. */
@Component
class ListingInterestRegistrar implements InterestRegistrar {

    private final InterestRepository interestRepository;
    private final PlatformListingRepository platformListingRepository;

    ListingInterestRegistrar(
            InterestRepository interestRepository, PlatformListingRepository platformListingRepository) {
        this.interestRepository = interestRepository;
        this.platformListingRepository = platformListingRepository;
    }

    @Override
    public ListingSource source() {
        return ListingSource.EXTERNAL;
    }

    @Override
    public Interest register(Member member, Long memberId, Long listingId) {
        PlatformListing listing = platformListingRepository
                .findById(listingId)
                .orElseThrow(() -> new PlatformListingNotFoundException(listingId));
        if (interestRepository.existsByMemberIdAndListingId(memberId, listingId)) {
            throw new InterestAlreadyExistsException();
        }
        return Interest.ofListing(member, listing);
    }
}
