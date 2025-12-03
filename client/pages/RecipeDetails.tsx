import { useNavigate } from "react-router-dom";

export default function RecipeDetails() {
    const navigate = useNavigate();

    return (
        <div className="relative mx-auto flex h-auto min-h-screen w-full max-w-[375px] flex-col bg-white group/design-root overflow-x-hidden font-display">
            {/* Header */}
            <header className="sticky top-0 z-10 flex h-[56px] items-center bg-white px-5">
                <div
                    className="flex size-10 items-center justify-center cursor-pointer"
                    onClick={() => navigate(-1)}
                >
                    <span className="material-symbols-outlined text-black">arrow_back</span>
                </div>
                <h1 className="flex-1 pr-10 text-center text-[22px] font-bold uppercase tracking-tight text-black">
                    RAINBOW QUINOA BOWL
                </h1>
            </header>

            <main className="flex-grow">
                <div className="px-5">
                    <div
                        className="mt-4 aspect-[4/3] w-full rounded-2xl bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage:
                                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAM9Ppn-7f6UrP3qGYUYFDI5B1UNAxPOvd5CyaRigh4gw5jLAw2fjMkIYll9rGReolx2Uicyo5t1-8llDso78MZx3YS66T6bfBAt9NzNUQR6oVVCwqE8euK7LfNwM0uP21AXZlOSB6Wm4mWR2DwEnRJ5g6fUwB-CiH5PQ53VOYKia6-iRyTsLOONyCRtfSNnd3otsCrN810hnko3eBID7Yc2e2BOOmZ5VXkSlifn2gmhpo1vAJkD-EkI-Bo1o0ZvLFHw2OaXcEmXGXd')",
                        }}
                    ></div>
                </div>

                <div className="-mt-8 rounded-t-xl bg-[#7A3F2B] pt-8">
                    <div className="px-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <h2 className="text-base font-medium text-[#F5F5F5]">Ingredients</h2>
                                <ul className="mt-3 space-y-3 text-base font-normal text-[#F5F5F5]">
                                    <li>1 cup Quinoa</li>
                                    <li>1/2 cup Black Beans</li>
                                    <li>1/4 cup Corn</li>
                                    <li>Mixed Vegetables (diced)</li>
                                </ul>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex size-[72px] shrink-0 flex-col items-center justify-center rounded-full bg-white bg-opacity-10 text-center text-white">
                                    <span className="text-base font-bold">30:00</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        Start Timer
                                    </span>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl text-[#F5F5F5]">
                                        mic
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pb-16">
                            <h2 className="text-base font-medium text-[#F5F5F5]">Steps</h2>
                            <ol className="mt-4 space-y-4 text-base font-normal text-[#F5F5F5]">
                                <li className="flex items-start gap-3">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white bg-opacity-20 text-sm font-bold text-white">
                                        1
                                    </div>
                                    <p className="pt-px">Rinse quinoa thoroughly.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white bg-opacity-20 text-sm font-bold text-white">
                                        2
                                    </div>
                                    <p className="pt-px">Cook quinoa according to package instructions.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white bg-opacity-20 text-sm font-bold text-white">
                                        3
                                    </div>
                                    <p className="pt-px">Combine cooked quinoa, beans, corn, and vegetables.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white bg-opacity-20 text-sm font-bold text-white">
                                        4
                                    </div>
                                    <p className="pt-px">Serve warm or cold.</p>
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
