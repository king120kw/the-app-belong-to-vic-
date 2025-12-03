import { useNavigate, useParams } from "react-router-dom";

export default function ChatConversation() {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="relative flex h-screen w-full flex-col bg-[#0b141a] group/design-root overflow-hidden">
            {/* Header */}
            <div className="flex items-center bg-[#1f2c34] p-2.5 justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-white flex size-10 shrink-0 items-center justify-center"
                    >
                        <span className="material-symbols-outlined !text-2xl">arrow_back</span>
                    </button>
                    <img
                        className="size-10 shrink-0 rounded-full"
                        alt="Profile picture"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjzcHdrU9Pp7ej-peQmxgJJDI_v-ucCK-u1Ljc8J-l9wE_CTUSaA5I6itDXit1bYs6QweE02FHa62qnXIvYsEJibkjU9W_dfUSkL7YdRsFQ5Qg8sXIaEWOhmnMyuBVopFvbAzn9yGWlLM4ChlICjAASikj14C7WssZU3kwLtGAFLDHMrfAqoPwidUCF-I8qzEDtL7zGZGr_bYzDQBGRNdTi6Y9EKTOKCGnnLbG2CTqhOTSfeNe4F1emtf_NAE_IAxswDmrRrMmSLHt"
                    />
                    <div className="flex flex-col">
                        <h2 className="text-white text-lg font-medium leading-tight">John Doe</h2>
                    </div>
                </div>
                <div className="flex items-center justify-end text-gray-300">
                    <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 w-10 bg-transparent text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                        <span
                            className="material-symbols-outlined !text-2xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            videocam
                        </span>
                    </button>
                    <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 w-10 bg-transparent text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                        <span className="material-symbols-outlined !text-2xl">call</span>
                    </button>
                    <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 w-10 bg-transparent text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                        <span className="material-symbols-outlined !text-2xl">more_vert</span>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Received Message */}
                <div className="flex items-end gap-3 justify-start">
                    <div className="flex max-w-[80%] flex-col gap-1 items-start">
                        <p className="text-base font-normal leading-normal flex rounded-lg rounded-bl-none px-3 py-1.5 bg-[#202c33] text-white">
                            Hey! How's your week going?
                        </p>
                    </div>
                </div>

                {/* Sent Voice Message */}
                <div className="flex items-end gap-3 justify-end">
                    <div className="flex max-w-[80%] flex-col gap-1 items-end">
                        <div className="flex items-center gap-2 rounded-lg rounded-br-none bg-vic-green px-3 py-1.5 w-[250px] text-slate-800">
                            <div className="flex items-center justify-center rounded-full size-8 bg-white text-vic-green shrink-0">
                                <span
                                    className="material-symbols-outlined text-3xl"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    play_arrow
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="w-full h-1 bg-slate-800/40 rounded-full relative">
                                    <div
                                        className="absolute top-0 left-0 h-1 bg-slate-800 rounded-full"
                                        style={{ width: "60%" }}
                                    ></div>
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-slate-800 rounded-full"
                                        style={{ left: "60%", transform: "translate(-50%, -50%)" }}
                                    ></div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-800/80">0:27</p>
                        </div>
                    </div>
                </div>

                {/* Sent Image Message */}
                <div className="flex items-end gap-3 justify-end">
                    <div className="flex max-w-[80%] flex-col gap-1 items-end">
                        <div className="bg-vic-green p-1.5 rounded-lg rounded-br-none">
                            <img
                                className="rounded-md w-full max-w-xs"
                                alt="A delicious looking pizza"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAe31KNkf_MSdZOxCs8Vp4wAWIFxQZPdPFBgwg7m5UcmRxsJqUU47xk7GLKfJDJJnTfXvssCw5LV5JAEE1pxXNEsAvCgkRm590T_8XyZNNhLWup6Z6C2bX6eRIrButP2Q0euCvMTSTqXjoJRsjWZNxxWlV2f-CLGv5lgiDZ_nletdN_afRBlNoUqVpjNgG9r5QJf87DopXWaJYUwyiHFD63zRF3ym5zVnLoRjZsXV50I9q0FVhoJWcQwMWbNewVFp13xUyzhzhkA6LD"
                            />
                            <p className="text-slate-800 px-1.5 py-1">
                                My progress to pizza night is looking good!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sent Video Message */}
                <div className="flex items-end gap-3 justify-end">
                    <div className="flex max-w-[80%] flex-col gap-1 items-end">
                        <div className="bg-vic-green p-1.5 rounded-lg rounded-br-none">
                            <div className="w-full max-w-xs relative">
                                <img
                                    className="rounded-md w-full"
                                    alt="Video thumbnail of someone cooking a healthy stir-fry in a wok"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNXNpM02g8dll1AWO3ENOMMv_3cnGqoV6NXSLTkaPBR-XhnThKTstYLLJPl_u7PZMyzSUyX4CG9gfH7K-JKGyoNmos1ryqhRDExKFRieorf3SqoroUjCzQSDVpvD0BR69rDFC_Es5hzOyMdyJvIjW4gda8sQzc9gNptPYuEDaRG8zsAKURLA3xI-wYCiEe7AtB3HvgBQlFcQlxgCY_ICPrNU553PuhOENjTLrMqLjVIn8IJC5XaRcxUvfGl3-cGe1-wo9lK4BIEbws"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <button className="flex items-center justify-center rounded-full size-12 bg-black/50 backdrop-blur-sm text-white">
                                        <span
                                            className="material-symbols-outlined !text-4xl ml-1"
                                            style={{ fontVariationSettings: "'FILL' 1" }}
                                        >
                                            play_arrow
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-800 px-1.5 py-1">
                                Video on me cooking a healthy stir-fry!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Bar */}
            <div className="flex items-end gap-2 p-2 shrink-0">
                <div className="flex-1 relative flex items-center bg-[#202c33] rounded-full">
                    <button className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full h-9 w-9 bg-transparent text-gray-400">
                        <span className="material-symbols-outlined !text-2xl">mood</span>
                    </button>
                    <input
                        className="w-full h-12 px-12 bg-transparent border-transparent focus:ring-0 text-white placeholder:text-gray-500"
                        placeholder="Message"
                        type="text"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button className="flex items-center justify-center rounded-full h-9 w-9 bg-transparent text-gray-400">
                            <span className="material-symbols-outlined !text-2xl -rotate-45">attach_file</span>
                        </button>
                        <button className="flex items-center justify-center rounded-full h-9 w-9 bg-transparent text-gray-400">
                            <span className="material-symbols-outlined !text-2xl">photo_camera</span>
                        </button>
                    </div>
                </div>
                <button className="flex items-center justify-center overflow-hidden rounded-full h-12 w-12 bg-vic-green text-slate-800 shrink-0">
                    <span className="material-symbols-outlined !text-2xl">mic</span>
                </button>
            </div>
        </div>
    );
}
