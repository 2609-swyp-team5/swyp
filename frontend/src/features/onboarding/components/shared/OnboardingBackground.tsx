import Image from "next/image";

export function OnboardingBackground() {
    return (
        <Image
            src="/onboarding/background.png"
            alt=""
            width={2880}
            height={1260}
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[630px] w-full object-cover"
        />
    );
}
