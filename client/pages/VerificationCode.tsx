import { useState, useRef, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function VerificationCode() {
    const navigate = useNavigate();
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const phoneNumber = localStorage.getItem("phoneNumber") || "+1 123-456-7890";

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value[0];
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = () => {
        const verificationCode = code.join("");
        if (verificationCode.length === 6) {
            // Mark phone as verified
            localStorage.setItem("phoneVerified", "true");
            // Navigate to chat
            navigate("/chat");
        }
    };

    const handleResend = () => {
        console.log("Resending code...");
    };

    return (
        <div className="relative flex h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark font-display">
            {/* Background Pattern */}
            <div
                className="absolute inset-0 opacity-5 dark:opacity-[0.02] -z-10"
                style={{
                    backgroundImage:
                        "url(https://lh3.googleusercontent.com/aida-public/AB6AXuATZOc1n-6hF3qELrFfm7xP7BdzoZAck9T0zNMI8Q-8vNQGg1xJ43JikbKhngbtybflU1SV8dCJBAUqsxkHoVCxei7KurHvxK-5To_AkFHIGvxoLQ2tQnIoL1goHk2q5oAxKFfKdDeGdF7bjhBOwOL6w2YZ82NweT6qrtd5pbJaj_dVo4OdWmgSaBujR186-cxg1O5_zLVLeGO9es7gcKn4NY0iFnrn0k5DkjChkVKKa1nXbf3u5KNOeyZOUWI6VuQzfj-MvwUbOrRk)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            ></div>

            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center p-4 pb-2 justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-800 dark:text-gray-200 flex size-12 shrink-0 items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <h2 className="text-slate-800 dark:text-gray-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
                        Welcome to VicCalary
                    </h2>
                </div>

                {/* Main Content */}
                <div className="flex-grow flex flex-col justify-center items-center px-4">
                    <h1 className="text-[#111418] dark:text-gray-100 tracking-light text-[32px] font-bold leading-tight text-center pb-3 pt-6">
                        Enter the 6-digit code
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal pb-3 pt-1 text-center">
                        Sent to {phoneNumber}
                    </p>

                    {/* Code Input */}
                    <div className="flex justify-center px-4 py-8">
                        <fieldset className="relative flex gap-3 sm:gap-4">
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="flex h-16 w-12 sm:h-20 sm:w-16 text-center text-2xl font-bold bg-white/50 dark:bg-background-dark/50 dark:text-gray-100 [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-vic-green rounded-lg border border-gray-300 dark:border-gray-700 focus:border-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                            ))}
                        </fieldset>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal pb-3 pt-4 text-center">
                        Didn't receive a code?{" "}
                        <button
                            onClick={handleResend}
                            className="font-semibold text-lime-600 dark:text-lime-500 hover:underline"
                        >
                            Resend Code
                        </button>
                    </p>
                </div>

                {/* Verify Button */}
                <div className="px-4 py-6 mt-auto">
                    <button
                        onClick={handleVerify}
                        disabled={code.join("").length !== 6}
                        className="w-full bg-vic-green text-slate-800 dark:text-gray-900 font-bold py-4 px-4 rounded-xl hover:bg-vic-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vic-green focus:ring-offset-background-light dark:focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Verify
                    </button>
                </div>
            </div>
        </div>
    );
}
