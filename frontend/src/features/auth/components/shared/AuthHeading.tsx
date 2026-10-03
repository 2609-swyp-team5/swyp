export function AuthHeading({ title }: { title: string }) {
    return (
        <>
            <div className="text-center">
                <p className="typography-body-medium leading-[30px] font-semibold text-[#464646]">
                    AI와 함께하는 똑똑한 중고거래
                </p>
                <p className="typography-heading-01 text-primary mt-2.5 dark:text-[#6653fb]">
                    지금이니?
                </p>
            </div>
            <h1
                id="page-title"
                className="typography-heading-03 mt-20 leading-[42px] font-bold text-[#363636]"
            >
                {title}
            </h1>
        </>
    );
}
