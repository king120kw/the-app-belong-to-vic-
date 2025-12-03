import { Link, useNavigate } from "react-router-dom";

export default function Cookbook() {
    const navigate = useNavigate();
    return (
        <div className="w-full h-screen mx-auto overflow-hidden flex flex-col relative shadow-2xl bg-background-light dark:bg-background-dark font-display">
            {/* Header */}
            <header className="bg-vic-green pt-11 pb-4 px-6 rounded-b-3xl">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-slate-800 dark:text-gray-900">
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-gray-900">Cookbook</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Search Bar */}
                <div className="mt-4 mb-5">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                            search
                        </span>
                        <input
                            className="w-full pl-12 pr-14 py-3.5 border-none rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-vic-green/50 outline-none"
                            placeholder="Find Recipes..."
                            type="text"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-vic-green rounded-full w-10 h-10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white dark:text-gray-900 rotate-90">
                                tune
                            </span>
                        </button>
                    </div>
                </div>

                {/* Recipe Cards */}
                <div className="space-y-5">
                    {/* Card 1 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden relative">
                        <img
                            alt="Superfood avocado toast with cherry tomatoes on a white plate"
                            className="w-full h-48 object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNRLdGQnq9zitCiD1AemTJCgQH6NtHimDpuMO3JO5qm0_j_3qVlNBUBNrS7kvitfEyetUIacXWwBBGVc7aq3w6RSniOOgv8qU_99tGTTM9pH7cHWN1QlSaZCvjolAhakGmW7BLYkk8TEEJfgY2kuvlG6kUEz5EpgkvlK9lQyc_BQlB8m1e6LaiSW5cE6jtgefEK7LVcXno7FjUrkguEPXz9ZNNRyXkGFKTdw1YDrAOgJcXid6qeI7wK4k6_77HUXwy9dHuxHG21I4O"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-5">
                            <h2 className="text-white font-bold text-2xl">
                                Superfood<br />Avocado Toast
                            </h2>
                            <p className="text-white/80 mt-1">20 Minutes</p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden relative">
                        <img
                            alt="Rainbow quinoa bowl with various vegetables"
                            className="w-full h-48 object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl60zlw0WQ9eI-qtRKoaZGm5U8En9ctnW9habHbURSKfILZDoGpy9TZIrSwoWv__Ug8CdKiL8ehg21PfKf5s5sBvIbvv2EgOLUt8S83NquB2Q06uXK87Fqxc7_GI-1YC8uLBc7J4tja4P53Cb4AUONKn3YbW8XL2BnlU620kkaYNlAxdsXbinc-DNrOX8a_bLTrgGgp6Wiu6m647a2F0nHX21YUcvg2Ot-HNyYvX1TIErBccOXKaO1B0ENiYSTFHOxMtbkd8-doN9s"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-5 w-full flex justify-between items-end">
                            <div>
                                <h2 className="text-white font-bold text-2xl">Rainbow Quinoa Bowl</h2>
                                <p className="text-white/80 mt-1">30 Minutes</p>
                            </div>
                            <button
                                onClick={() => navigate("/recipe/rainbow-quinoa-bowl")}
                                className="bg-vic-green text-gray-800 dark:text-gray-900 font-semibold text-sm py-2 px-5 rounded-full"
                            >
                                View Recipe
                            </button>
                        </div>
                    </div>

                    {/* Card 3 (Horizontal) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                                Rainbow Quinoa Bowl
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                                Protein-Packed Lunch Idea
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/recipe/rainbow-quinoa-bowl")}
                            className="bg-vic-green text-gray-800 dark:text-gray-900 font-semibold text-sm py-2 px-5 rounded-full"
                        >
                            View Recipe
                        </button>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden relative">
                        <img
                            alt="Lemon herb baked salmon with asparagus"
                            className="w-full h-48 object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIyzmnXB_bj9m_N4Nq8LE6vKi9X740SvykTD5gnqAsLOL0cQGPE2Rq2mDfXNHRoeuKRigPlxoE1ZSm_FpqfYqeoWf3wn23C4ITwRC5oKHb5CwLZtH3GH-iIlk3A_Cp6vv_iQm-h7KeLHbMW-NL8Q9JAfxbg2mum75UtVN6jWVONxCeal4558gsupecdQGOfrVPmk26BwnYYRxnPmC9QVCmg21-wtppYVMWU4UYguQ4UN6Wrw3VMz2ksDPw9nniI4PnKFlMZZOZjnmj"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-5 w-full flex justify-between items-end">
                            <div>
                                <h2 className="text-white font-bold text-2xl">
                                    Lemon Herb Baked Salmon
                                </h2>
                                <p className="text-white/80 mt-1">Healthy Dinner in 30 Minutes</p>
                            </div>
                            <button
                                onClick={() => navigate("/recipe/lemon-herb-salmon")}
                                className="bg-vic-green text-gray-800 dark:text-gray-900 font-semibold text-sm py-2 px-5 rounded-full"
                            >
                                View Recipe
                            </button>
                        </div>
                    </div>

                    {/* Card 5 (New - Grilled Chicken) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden relative">
                        <img
                            alt="Grilled Chicken Breast"
                            className="w-full h-48 object-cover"
                            src="/grilled-chicken.jpg"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-5 w-full flex justify-between items-end">
                            <div>
                                <h2 className="text-white font-bold text-2xl">
                                    Grilled Chicken Breast
                                </h2>
                                <p className="text-white/80 mt-1">Healthy Protein in 25 Minutes</p>
                            </div>
                            <button
                                onClick={() => navigate("/recipe/grilled-chicken")}
                                className="bg-vic-green text-gray-800 dark:text-gray-900 font-semibold text-sm py-2 px-5 rounded-full"
                            >
                                View Recipe
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
