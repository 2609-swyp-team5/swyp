export const revealMotion = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.65, ease: "easeOut" as const },
};

export const textRiseMotion = {
    hidden: { y: 32, clipPath: "inset(100% 0 0 0)" },
    visible: {
        y: 0,
        clipPath: "inset(-16px -16px -16px -16px)",
        transition: { duration: 1.2, ease: "easeOut" as const },
    },
};

export const cardMotion = {
    ...revealMotion,
    initial: { opacity: 0, y: 56, scale: 0.94, rotate: -2 },
    whileInView: { opacity: 1, y: 0, scale: 1, rotate: 0 },
    whileHover: {
        y: -10,
        scale: 1.02,
        transition: { type: "spring" as const, stiffness: 280, damping: 18 },
    },
};
