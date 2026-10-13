type RegistrationStepperProps = {
    steps: readonly string[];
    currentStepIndex: number;
};

export function RegistrationStepper({ steps, currentStepIndex }: RegistrationStepperProps) {
    return (
        <ol aria-label="상품 등록 단계" className="flex items-center gap-2.5">
            {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2">
                        <span
                            className={`flex size-7 items-center justify-center rounded-full text-[13px] leading-[19px] font-bold ${
                                index <= currentStepIndex
                                    ? "bg-[#6653fb] text-white"
                                    : "bg-[#d3d3d3] text-[#6b6c7b]"
                            }`}
                        >
                            {index + 1}
                        </span>
                        <span
                            className={`text-[16px] leading-[25px] font-semibold tracking-[0.5px] ${
                                index <= currentStepIndex ? "text-[#6653fb]" : "text-[#d3d3d3]"
                            }`}
                        >
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <span
                            aria-hidden="true"
                            className={`h-px w-[30px] ${
                                index < currentStepIndex ? "bg-[#6653fb]" : "bg-[#d3d3d3]"
                            }`}
                        />
                    )}
                </li>
            ))}
        </ol>
    );
}
