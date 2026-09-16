import Link from "next/link";

export default function LoginPage() {
    return (
        <main className="bg-muted/20 flex flex-1 px-6 py-12 lg:px-8">
            <section
                aria-labelledby="page-title"
                className="mx-auto flex w-full max-w-7xl flex-col gap-8"
            >
                <div className="border-border bg-background rounded-2xl border p-8">
                    <h1 id="page-title" className="text-3xl font-bold tracking-tight">
                        로그인
                    </h1>
                    <p className="text-muted-foreground mt-3 max-w-2xl">로그인 화면입니다.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Link
                        href="/home"
                        className="border-border bg-background hover:border-primary rounded-xl border p-5 transition-colors"
                    >
                        <span className="font-semibold">비회원 로그인</span>
                        <span className="text-muted-foreground mt-2 block text-sm">
                            인증 없이 홈 화면으로 이동
                        </span>
                        <span className="text-primary mt-4 block text-sm">이동하기 →</span>
                    </Link>
                    <Link
                        href="/signup"
                        className="border-border bg-background hover:border-primary rounded-xl border p-5 transition-colors"
                    >
                        <span className="font-semibold">회원가입</span>
                        <span className="text-muted-foreground mt-2 block text-sm">
                            새 계정 만들기
                        </span>
                        <span className="text-primary mt-4 block text-sm">이동하기 →</span>
                    </Link>
                    <Link
                        href="/account/recovery"
                        className="border-border bg-background hover:border-primary rounded-xl border p-5 transition-colors"
                    >
                        <span className="font-semibold">아이디/비밀번호 찾기</span>
                        <span className="text-muted-foreground mt-2 block text-sm">
                            계정 찾기 화면
                        </span>
                        <span className="text-primary mt-4 block text-sm">이동하기 →</span>
                    </Link>
                </div>
            </section>
        </main>
    );
}
