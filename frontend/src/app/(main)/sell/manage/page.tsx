export default function SellManagePage() {
    return (
        <main className="bg-muted/20 flex flex-1 px-6 py-12 lg:px-8">
            <section
                aria-labelledby="page-title"
                className="mx-auto flex w-full max-w-7xl flex-col gap-8"
            >
                <div className="border-border bg-background rounded-2xl border p-8">
                    <h1 id="page-title" className="text-3xl font-bold tracking-tight">
                        판매 상품 관리
                    </h1>
                    <p className="text-muted-foreground mt-3 max-w-2xl">
                        등록한 상품 목록과 판매 상태를 확인하는 화면입니다.
                    </p>
                </div>
            </section>
        </main>
    );
}
