import { useNavigate } from "react-router-dom";

export default function Budget() {
    const navigate = useNavigate();

    return (
        <div className="font-display bg-background-light dark:bg-background-dark min-h-screen">
            <div className="max-w-sm mx-auto p-4 space-y-6">
                {/* Header / Back Button */}
                <div className="flex items-center mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-800 dark:text-white">arrow_back</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-sm p-6 space-y-6">
                    <h1 className="text-xl font-bold text-center text-vic-deep-blue dark:text-white">
                        Budget set by the user
                    </h1>

                    {/* Progress Ring */}
                    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 120 120">
                            <circle
                                className="stroke-current text-gray-200 dark:text-gray-700"
                                cx="60"
                                cy="60"
                                fill="none"
                                r="54"
                                strokeWidth="12"
                            ></circle>
                            <circle
                                className="progress-ring-circle stroke-current text-vic-deep-blue dark:text-vic-green"
                                cx="60"
                                cy="60"
                                fill="none"
                                r="54"
                                strokeWidth="12"
                                style={{ strokeDasharray: 339.292, strokeDashoffset: 84.823 }}
                            ></circle>
                        </svg>
                        <div className="absolute text-center">
                            <p className="text-3xl font-bold text-vic-deep-blue dark:text-white">$225.50</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                spent of $300 set budget
                            </p>
                        </div>
                    </div>

                    {/* Budget Input */}
                    <div className="space-y-2">
                        <label
                            className="text-sm font-semibold text-slate-800 dark:text-white"
                            htmlFor="budget"
                        >
                            Set Your Monthly Budget:
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
                                $
                            </span>
                            <input
                                className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-background-light dark:bg-background-dark focus:ring-vic-deep-blue focus:border-vic-deep-blue text-slate-800 dark:text-white"
                                id="budget"
                                name="budget"
                                type="number"
                                defaultValue="300"
                            />
                        </div>
                    </div>

                    {/* Monthly Food Budget Bar */}
                    <div className="space-y-3">
                        <h2 className="text-center font-bold text-vic-deep-blue dark:text-white">
                            Monthly Food Budget
                        </h2>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 relative">
                            <div
                                className="bg-vic-green h-2.5 rounded-l-full absolute left-0 top-0"
                                style={{ width: "70%" }}
                            ></div>
                            <div
                                className="bg-vic-deep-blue h-2.5 absolute top-0"
                                style={{ width: "20%", left: "70%" }}
                            ></div>
                            <div
                                className="bg-gray-500 h-2.5 rounded-r-full absolute top-0"
                                style={{ width: "5%", left: "90%" }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Groceries</span>
                            <span>Restaurants: $60</span>
                            <span className="flex items-center gap-1">
                                Coffee: 15.50 <span className="material-symbols-outlined text-sm">coffee</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Warning Alert */}
                <div
                    className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-r-lg"
                    role="alert"
                >
                    <div className="flex items-start">
                        <div className="py-1">
                            <span className="material-symbols-outlined text-red-500">warning</span>
                        </div>
                        <div className="ml-3">
                            <p className="font-bold">Budget Exceeded!</p>
                            <p className="text-sm">
                                You are over your monthly food budget with your last scanned item.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
                        <p className="text-sm font-semibold mb-2">
                            Save money with these alternatives:
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span>Store Brand Organic Oats</span>
                                <span className="font-bold text-vic-green">Save $2.50</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span>Fresh Market Apples (3lb)</span>
                                <span className="font-bold text-vic-green">Save $1.75</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-vic-deep-blue dark:text-white">
                        Recent Transactions
                    </h2>
                    <div className="space-y-3">
                        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                                        shopping_cart
                                    </span>
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-white">
                                    Whole Foods
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-vic-deep-blue dark:text-vic-green">-$45.30</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Oct 26</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                                        restaurant
                                    </span>
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-white">
                                    Dinner at Bistro
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-vic-deep-blue dark:text-vic-green">-$32.80</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Oct 21</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                                        coffee
                                    </span>
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-white">
                                    Morning Coffee
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-vic-deep-blue dark:text-vic-green">-$4.50</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Oct 26</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 grid grid-cols-2 gap-4 pb-8">
                    <button className="bg-vic-deep-blue text-white font-bold py-4 px-6 rounded-full shadow-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vic-deep-blue dark:focus:ring-offset-background-dark transform active:scale-95 transition-transform">
                        Set Budget
                    </button>
                    <button className="bg-vic-green text-white font-bold py-4 px-6 rounded-full shadow-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vic-green dark:focus:ring-offset-background-dark transform active:scale-95 transition-transform">
                        Add Expense
                    </button>
                </div>
            </div>
        </div>
    );
}
