import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PhoneInput() {
    const navigate = useNavigate();
    const [phoneNumber, setPhoneNumber] = useState("");

    const handleContinue = () => {
        if (phoneNumber.length >= 10) {
            // Store phone number for verification
            localStorage.setItem("phoneNumber", `+1${phoneNumber}`);
            navigate("/verification-code");
        }
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
                        Enter your phone number
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal pb-3 pt-1 text-center max-w-md">
                        We'll send you a verification code to confirm your number
                    </p>

                    {/* Phone Input */}
                    <div className="w-full max-w-md px-4 py-8">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                <span className="text-gray-600 dark:text-gray-400 text-lg">+1</span>
                            </div>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                                placeholder="123-456-7890"
                                maxLength={10}
                                className="w-full pl-12 pr-4 py-4 text-lg font-medium bg-white/50 dark:bg-background-dark/50 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-vic-green rounded-xl border border-gray-300 dark:border-gray-700 focus:border-transparent"
                            />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">
                            Standard message and data rates may apply
                        </p>
                    </div>
                </div>

                {/* Continue Button */}
                <div className="px-4 py-6 mt-auto">
                    <button
                        onClick={handleContinue}
                        disabled={phoneNumber.length < 10}
                        className="w-full bg-vic-green text-slate-800 dark:text-gray-900 font-bold py-4 px-4 rounded-xl hover:bg-vic-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vic-green focus:ring-offset-background-light dark:focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
